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
    $v = is_string($v) ? $v : '';
    $v = str_replace(["\r", "\n"], ' ', $v);
    return trim($v);
}

$required = ['firstName', 'lastName', 'email', 'subject', 'message'];
foreach ($required as $key) {
    if (!isset($data[$key]) || $data[$key] === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'missing_field', 'field' => $key]);
        exit;
    }
}

$firstName = clean($data['firstName']);
$lastName  = clean($data['lastName']);
$email     = clean($data['email']);
$phone     = clean($data['phone'] ?? '');
$subject   = clean($data['subject']);
$message   = is_string($data['message']) ? trim($data['message']) : '';

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'invalid_email']);
    exit;
}

$body  = "Neue Kontaktanfrage - Kaleburcu.ch\n\n";
$body .= "Name: {$firstName} {$lastName}\n";
$body .= "E-Mail: {$email}\n";
$body .= "Telefon: " . ($phone !== '' ? $phone : '-') . "\n";
$body .= "Betreff: {$subject}\n\n";
$body .= "Nachricht:\n{$message}\n";

$to      = 'info@kaleburcu.ch';
$mailSubject = "Kontaktanfrage: {$subject}";
$headers  = "From: Kaleburcu Website <bestellungen@kaleburcu.ch>\r\n";
$headers .= "Reply-To: {$firstName} {$lastName} <{$email}>\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

$sent = @mail($to, $mailSubject, $body, $headers);

$logDir = __DIR__ . '/order-log';
if (!is_dir($logDir)) { @mkdir($logDir, 0750, true); }
if (!file_exists($logDir . '/.htaccess')) {
    @file_put_contents($logDir . '/.htaccess', "Require all denied\nDeny from all\n");
}
$logLine = date('c') . "\tcontact\t{$firstName} {$lastName}\t{$email}\t{$subject}\t" . ($sent ? 'sent' : 'MAIL_FAILED') . "\n";
@file_put_contents($logDir . '/orders.log', $logLine, FILE_APPEND | LOCK_EX);

if ($sent) {
    echo json_encode(['ok' => true]);
} else {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'mail_failed']);
}
