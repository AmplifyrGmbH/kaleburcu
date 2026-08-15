<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: https://www.kaleburcu.ch');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
}

require __DIR__ . '/inc/stock-store.php';

echo json_encode(['ok' => true, 'stock' => stock_read()]);
