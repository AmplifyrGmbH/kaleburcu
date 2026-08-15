<?php
// Gemeinsamer Lagerbestand-Speicher für stock-status.php, order-handler.php und admin/stock.php.
// Nutzt eine JSON-Flatfile mit flock()-Locking statt einer DB (siehe order-log/orders.log für das gleiche Muster).

const STOCK_FILE = __DIR__ . '/../data/stock.json';
const STOCK_SKUS = ['small', 'large'];

function stock_base_id($id) {
    $pos = strpos($id, ':');
    return $pos === false ? $id : substr($id, 0, $pos);
}

function stock_ensure_file() {
    $dir = dirname(STOCK_FILE);
    if (!is_dir($dir)) { @mkdir($dir, 0750, true); }
    if (!file_exists($dir . '/.htaccess')) {
        @file_put_contents($dir . '/.htaccess', "Require all denied\nDeny from all\n");
    }
    if (!file_exists(STOCK_FILE)) {
        @file_put_contents(STOCK_FILE, json_encode(array_fill_keys(STOCK_SKUS, 0), JSON_PRETTY_PRINT));
    }
}

function stock_normalize($data) {
    if (!is_array($data)) { $data = []; }
    foreach (STOCK_SKUS as $sku) {
        if (!isset($data[$sku]) || !is_numeric($data[$sku])) { $data[$sku] = 0; }
        $data[$sku] = max(0, (int)$data[$sku]);
    }
    return $data;
}

// Nur für Anzeige (Shop-Frontend, Admin-Formular) — kein Lock nötig, leicht veraltete Werte sind unkritisch.
function stock_read() {
    stock_ensure_file();
    $raw = @file_get_contents(STOCK_FILE);
    return stock_normalize(json_decode($raw, true));
}

// Nur für den Admin-Screen: absolute Werte setzen.
function stock_write($data) {
    stock_ensure_file();
    @file_put_contents(STOCK_FILE, json_encode(stock_normalize($data), JSON_PRETTY_PRINT), LOCK_EX);
}

// $requested: Liste von ['id' => cartId, 'qty' => int]. Prüft und dekrementiert atomar (ein einziger exklusiver Lock),
// damit zwei gleichzeitige Bestellungen sich nicht überbieten können (kein TOCTOU).
// Rückgabe: ['ok' => true] oder ['ok' => false, 'shortages' => [['id','requested','available'], ...]]
function stock_check_and_decrement($requested) {
    stock_ensure_file();
    $fp = fopen(STOCK_FILE, 'c+');
    if (!$fp || !flock($fp, LOCK_EX)) {
        if ($fp) { fclose($fp); }
        return ['ok' => false, 'shortages' => []];
    }

    $raw = stream_get_contents($fp);
    $data = stock_normalize(json_decode($raw, true));

    $need = [];
    foreach ($requested as $item) {
        $base = stock_base_id((string)($item['id'] ?? ''));
        if (!in_array($base, STOCK_SKUS, true)) { continue; }
        $qty = (int)($item['qty'] ?? 0);
        if ($qty <= 0) { continue; }
        $need[$base] = ($need[$base] ?? 0) + $qty;
    }

    $shortages = [];
    foreach ($need as $sku => $qty) {
        if ($data[$sku] < $qty) {
            $shortages[] = ['id' => $sku, 'requested' => $qty, 'available' => $data[$sku]];
        }
    }

    if (!empty($shortages)) {
        flock($fp, LOCK_UN);
        fclose($fp);
        return ['ok' => false, 'shortages' => $shortages];
    }

    foreach ($need as $sku => $qty) {
        $data[$sku] -= $qty;
    }

    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($data, JSON_PRETTY_PRINT));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    return ['ok' => true];
}
