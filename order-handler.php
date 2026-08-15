<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: https://www.kaleburcu.ch');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'invalid_json']);
    exit;
}

function clean($v) {
    $v = is_string($v) ? $v : (is_numeric($v) ? (string)$v : '');
    $v = str_replace(["\r", "\n"], ' ', $v);
    return trim($v);
}

$required = ['firstName', 'lastName', 'email', 'phone', 'street', 'plz', 'shippingLabel', 'payment', 'subtotal', 'shipping', 'total'];
foreach ($required as $key) {
    if (!isset($data[$key]) || $data[$key] === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'missing_field', 'field' => $key]);
        exit;
    }
}

$firstName     = clean($data['firstName']);
$lastName      = clean($data['lastName']);
$email         = clean($data['email']);
$phone         = clean($data['phone']);
$street        = clean($data['street']);
$plz           = clean($data['plz']);
$notes         = clean($data['notes'] ?? '');
$shippingLabel = clean($data['shippingLabel']);
$payment       = clean($data['payment']);
$subtotal      = clean($data['subtotal']);
$shipping      = clean($data['shipping']);
$mwst          = clean($data['mwst'] ?? '');
$total         = clean($data['total']);
$items         = is_array($data['items'] ?? null) ? $data['items'] : [];

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'invalid_email']);
    exit;
}

require __DIR__ . '/inc/stock-store.php';

$stockRequest = [];
foreach ($items as $it) {
    $itemId = isset($it['id']) ? clean($it['id']) : '';
    $itemQty = isset($it['qty']) ? (int)$it['qty'] : 0;
    if ($itemId === '' || $itemQty <= 0) continue;
    $stockRequest[] = ['id' => $itemId, 'qty' => $itemQty];
}

$stockResult = stock_check_and_decrement($stockRequest);
if (!$stockResult['ok']) {
    http_response_code(409);
    echo json_encode(['ok' => false, 'error' => 'out_of_stock', 'shortages' => $stockResult['shortages']]);
    exit;
}

$orderNumber = 'KB-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));

$itemLines = '';
foreach ($items as $it) {
    $name = clean($it['name'] ?? '');
    $meta = clean($it['meta'] ?? '');
    $qty  = clean($it['qty'] ?? '');
    $sum  = clean($it['sum'] ?? '');
    if ($name === '') continue;
    $itemLines .= "- {$qty}x {$name} ({$meta}) - {$sum}\n";
}

$body  = "Neue Bestellung - Kaleburcu.ch\n";
$body .= "Bestellnummer: {$orderNumber}\n\n";
$body .= "Kunde: {$firstName} {$lastName}\n";
$body .= "Adresse: {$street}, {$plz}\n";
$body .= "E-Mail: {$email}\n";
$body .= "Telefon: {$phone}\n\n";
$body .= "Bestellte Artikel:\n{$itemLines}\n";
$body .= "Zwischensumme: {$subtotal}\n";
$body .= "Versand ({$shippingLabel}): {$shipping}\n";
if ($mwst !== '') $body .= "MwSt. 2.6% (inkl.): {$mwst}\n";
$body .= "Total: {$total}\n\n";
$body .= "Zahlungswunsch: {$payment}\n";
$body .= "Anmerkungen: " . ($notes !== '' ? $notes : '-') . "\n";

$to      = 'info@kaleburcu.ch';
$subject = "Neue Bestellung {$orderNumber} von {$firstName} {$lastName}";
$headers = "From: Kaleburcu Webshop <bestellungen@kaleburcu.ch>\r\n";
$headers .= "Reply-To: {$firstName} {$lastName} <{$email}>\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

$sent = @mail($to, $subject, $body, $headers);

$logDir = __DIR__ . '/order-log';
if (!is_dir($logDir)) { @mkdir($logDir, 0750, true); }
if (!file_exists($logDir . '/.htaccess')) {
    @file_put_contents($logDir . '/.htaccess', "Require all denied\nDeny from all\n");
}
$logLine = date('c') . "\t{$orderNumber}\t{$firstName} {$lastName}\t{$email}\t{$total}\t" . ($sent ? 'sent' : 'MAIL_FAILED') . "\n";
@file_put_contents($logDir . '/orders.log', $logLine, FILE_APPEND | LOCK_EX);

if ($sent) {
    echo json_encode(['ok' => true, 'orderNumber' => $orderNumber]);
} else {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'mail_failed', 'orderNumber' => $orderNumber]);
}
