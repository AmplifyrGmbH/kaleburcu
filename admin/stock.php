<?php
require __DIR__ . '/.admin-credentials.php';
require __DIR__ . '/../inc/stock-store.php';

$user = $_SERVER['PHP_AUTH_USER'] ?? '';
$pass = $_SERVER['PHP_AUTH_PW'] ?? '';
if ($user === '' && isset($_SERVER['HTTP_AUTHORIZATION']) && stripos($_SERVER['HTTP_AUTHORIZATION'], 'basic ') === 0) {
    // Fallback für FastCGI-Setups, bei denen PHP_AUTH_USER/PW nicht automatisch gesetzt werden.
    $decoded = base64_decode(substr($_SERVER['HTTP_AUTHORIZATION'], 6));
    if ($decoded !== false && strpos($decoded, ':') !== false) {
        [$user, $pass] = explode(':', $decoded, 2);
    }
}
if ($user !== ADMIN_USERNAME || !password_verify($pass, ADMIN_PASSWORD_HASH)) {
    header('WWW-Authenticate: Basic realm="Kaleburcu Admin"');
    header('HTTP/1.1 401 Unauthorized');
    echo 'Zugriff verweigert.';
    exit;
}

$saved = false;
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = stock_read();
    foreach (STOCK_SKUS as $sku) {
        $val = $_POST[$sku] ?? null;
        if ($val === null || $val === '' || !ctype_digit((string)$val)) {
            $error = 'Ungültige Menge für „' . htmlspecialchars($sku) . '“ — bitte eine ganze Zahl ≥ 0 eingeben.';
            break;
        }
        $data[$sku] = (int)$val;
    }
    if ($error === '') {
        stock_write($data);
        $saved = true;
    }
}

$stock = stock_read();
$labels = ['small' => 'Olivenöl 500 ml', 'large' => 'Olivenöl 5 Liter'];
?>
<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>Lagerbestand — Kaleburcu Admin</title>
<meta name="robots" content="noindex, nofollow">
<style>
  body{ font-family:'Segoe UI',Arial,sans-serif; max-width:480px; margin:60px auto; padding:0 20px; color:#192a24; }
  h1{ font-size:20px; margin-bottom:4px; }
  p.hint{ color:#6b6b6b; font-size:13px; margin-top:0; }
  label{ display:block; margin:20px 0 6px; font-weight:600; font-size:14px; }
  input[type=number]{ width:100%; padding:10px; font-size:16px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px; }
  button{ margin-top:26px; padding:12px 26px; background:#192a24; color:#fff; border:0; border-radius:4px; cursor:pointer; font-size:14px; }
  button:hover{ background:#2a4239; }
  .msg{ margin-top:18px; padding:10px 14px; border-radius:4px; background:#e8f5e9; color:#256029; font-size:14px; }
  .msg.err{ background:#fdecea; color:#b0623c; }
</style>
</head>
<body>
  <h1>Lagerbestand</h1>
  <p class="hint">Anzahl verfügbarer Flaschen pro Grösse. Wird bei jeder Bestellung automatisch reduziert.</p>

  <?php if ($saved): ?><div class="msg">Gespeichert.</div><?php endif; ?>
  <?php if ($error): ?><div class="msg err"><?= $error ?></div><?php endif; ?>

  <form method="post">
    <?php foreach (STOCK_SKUS as $sku): ?>
      <label for="<?= htmlspecialchars($sku) ?>"><?= htmlspecialchars($labels[$sku] ?? $sku) ?></label>
      <input type="number" min="0" step="1" name="<?= htmlspecialchars($sku) ?>" id="<?= htmlspecialchars($sku) ?>" value="<?= (int)$stock[$sku] ?>" required>
    <?php endforeach; ?>
    <button type="submit">Speichern</button>
  </form>
</body>
</html>
