<!DOCTYPE html>
<html>
<head>

<title>Verify OTP</title>

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">

<style>

body{

background:#6C63FF;

height:100vh;

display:flex;

justify-content:center;

align-items:center;

}

.card{

width:400px;

padding:30px;

border-radius:20px;

}

</style>

</head>

<body>

<div class="card bg-white">

<h2 class="text-center mb-4">

Verify OTP

</h2>

<form action="/verify-otp" method="POST">

<input
type="hidden"
name="email"
value="<%= email %>">

<input
type="text"
name="otp"
maxlength="6"
placeholder="Enter OTP"
class="form-control mb-3"
required>

<button class="btn btn-success w-100">

Verify OTP

</button>

</form>

<% if(message){ %>

<div class="alert alert-danger mt-3">

<%= message %>

</div>

<% } %>

</div>

</body>
</html>