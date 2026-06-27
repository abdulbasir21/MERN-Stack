export const verify_Email_Template = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Email Verification OTP</title>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 p-4">
    <div class="max-w-lg mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <!-- Header -->
        <div class="bg-blue-600 text-white text-center p-6">
            <h1 class="text-2xl font-semibold">Verify Your Email</h1>
        </div>

        <!-- Content -->
        <div class="p-6 text-center">
            <p class="text-gray-700 mb-4">Hello,{name}</p>
            <p class="text-gray-700 mb-6">
                Thank you for signing up! Please verify your email address <strong>{email}</strong> by entering the OTP below. This OTP is valid for 10 minutes.
            </p>

            <!-- OTP -->
            <div class="inline-block bg-blue-600 text-white text-3xl font-bold px-8 py-4 rounded-lg tracking-widest mb-6">
                {otp}
            </div>

            <p class="text-gray-500 text-sm">
                If you did not create an account, you can safely ignore this email.
            </p>
        </div>

        <!-- Footer -->
        <div class="bg-gray-100 text-center text-gray-500 text-xs p-4">
            &copy; 2025 Your Company. All rights reserved.
        </div>
    </div>
</body>
</html>
`;
