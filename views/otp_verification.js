<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>OTP Verification</title>

    <style>
        body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: linear-gradient(to right, #43e97b, #38f9d7);
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .card {
            background: white;
            padding: 30px;
            width: 320px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            text-align: center;
        }

        h2 {
            margin-bottom: 15px;
            color: #333;
        }

        p {
            font-size: 14px;
            color: #666;
        }

        input {
            width: 100%;
            padding: 10px;
            margin-top: 15px;
            border-radius: 6px;
            border: 1px solid #ccc;
            text-align: center;
            font-size: 18px;
            letter-spacing: 5px;
        }

        input:focus {
            border-color: #43e97b;
            box-shadow: 0 0 5px #43e97b;
        }

        button {
            margin-top: 20px;
            width: 100%;
            padding: 10px;
            background: #43e97b;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
        }

        button:hover {
            background: #2ecc71;
        }

        .msg {
            margin-top: 15px;
            font-weight: bold;
            color: green;
        }

        .error {
            color: red;
        }

    </style>
</head>
<body>

<div class="card">
    <h2>OTP Verification</h2>
    <p>Enter the OTP sent to your account</p>

    <form method="POST">
       

        <input type="text" name="otp" maxlength="6" placeholder="Enter OTP" required>

        <button type="submit">Verify OTP</button>

        
            <div class="msg {% if 'Invalid' in message or 'expired' in message %}error{% endif %}">
                {{ message }}
            </div>
        
    </form>
</div>

</body>
</html>