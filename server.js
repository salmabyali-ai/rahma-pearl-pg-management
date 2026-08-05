// ======================================================
// RAHMA PEARL GIRLS PG MANAGEMENT SYSTEM
// SERVER.JS
// PART 1A
// ======================================================

require("dotenv").config();

const express = require("express");
const session = require("express-session");
const mysql = require("mysql2/promise");
const multer = require("multer");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const OpenAI = require("openai");
const cron = require("node-cron");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const app = express();

// ======================================================
// CREATE UPLOAD FOLDER
// ======================================================

const uploadFolder = path.join(__dirname, "public", "uploads");

if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, {
        recursive: true
    });
}

// ======================================================
// EXPRESS SETTINGS
// ======================================================

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({
    extended: true
}));

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.use("/uploads", express.static(uploadFolder));

// ======================================================
// SESSION
// ======================================================

app.use(
    session({
        secret: process.env.SESSION_SECRET || "rahma-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 24 * 60 * 60 * 1000
        }
    })
);

// ======================================================
// DATABASE CONNECTION
// ======================================================

let db;

async function connectDatabase() {
    try {

        db = await mysql.createConnection(process.env.DB_URL);

        console.log("=================================");
        console.log("MySQL Connected Successfully");
        console.log("=================================");

    } catch (err) {

        console.error("Database Connection Failed");
        console.error(err);
        process.exit(1);

    }
}

connectDatabase();

// ======================================================
// MULTER STORAGE
// ======================================================

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/uploads");
    },

    filename: function (req, file, cb) {
        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1e9) +
            path.extname(file.originalname);

        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: function (req, file, cb) {
        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "application/pdf"
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    "Only JPG, PNG and PDF files are allowed."
                )
            );
        }
    }
});
// ======================================================
// MAIL CONFIGURATION
// ======================================================

const transporter = nodemailer.createTransport({
    service: "gmail",

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

transporter.verify((error) => {
    if (error) {
        console.error("Email connection failed:", error.message);
    } else {
        console.log("Email server is ready.");
    }
});

// ======================================================
// OPENAI
// ======================================================

let openai = null;

try {

    if (process.env.OPENAI_KEY) {

        openai = new OpenAI({

            apiKey: process.env.OPENAI_KEY

        });

    }

}

catch (err) {

    console.log("OpenAI Disabled");

}

// ======================================================
// OTP STORE
// ======================================================

const otpStore = {};

// ======================================================
// MIDDLEWARE
// ======================================================

function isAdmin(req, res, next) {

    if (!req.session.admin) {

        return res.redirect("/login/admin");

    }

    next();

}

function isStudent(req, res, next) {

    if (!req.session.student) {

        return res.redirect("/login/student");

    }

    next();

}

function isValidEmail(email) {
    const emailPattern =
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    return emailPattern.test(email);
}

// ======================================================
// COMMON FUNCTIONS
// ======================================================

async function sendMail(to, subject, html) {

    try {

        await transporter.sendMail({

            from: process.env.EMAIL_USER,

            to,

            subject,

            html

        });

    }

    catch (err) {

        console.log(err);

    }

}

async function sendAdminAlert(subject, message) {

    try {

        await transporter.sendMail({

            from: process.env.EMAIL_USER,

            to: process.env.EMAIL_USER,

            subject,

            html: `<h3>${message}</h3>`

        });

    }

    catch (err) {

        console.log(err);

    }

}

// ======================================================
// HOME ROUTES
// ======================================================
app.get("/", async (req, res) => {
    try {

        // Get latest approved reviews
        const [reviews] = await db.query(`
            SELECT *
            FROM reviews
            WHERE status = 'Approved'
            ORDER BY created_at DESC
            LIMIT 6
        `);

        // Get review statistics
        const [stats] = await db.query(`
            SELECT
                COUNT(*) AS totalReviews,
                ROUND(AVG(rating),1) AS averageRating,
                SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS star5,
                SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS star4,
                SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS star3,
                SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS star2,
                SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS star1
            FROM reviews
            WHERE status = 'Approved'
        `);

        res.render("index", {
            reviews,
            stats: stats[0]
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

app.get("/about", (req, res) => {

    res.render("about");

});

// Contact Page
app.get("/contact", (req, res) => {
    res.render("contact", {
        success: null,
        error: null
    });
});

// Contact Form Submit
app.post("/contact", async (req, res) => {

    const { name, email, phone, message } = req.body;

    // your email sending code here

});

app.get("/features", (req, res) => {

    res.render("features");

});

app.get("/terms", (req, res) => {

    res.render("terms");

});

app.get("/login", (req, res) => {

    res.render("login");

});

app.get("/register", (req, res) => {
    res.render("register", {
        error: null,
        success: null,
        formData: {}
    });
});





// ======================================================
// PART 1B
// AUTHENTICATION MODULE
// ======================================================

// ----------------------------
// REGISTER STUDENT
// ----------------------------
app.post(
    "/register",
    upload.single("payment_proof"),
    async (req, res) => {
        const formData = {
            username: req.body.username || "",
            first_name: req.body.first_name || "",
            last_name: req.body.last_name || "",
            email: req.body.email || "",
            phone: req.body.phone || "",
            address: req.body.address || "",
            role: req.body.role || "",
            meal_type: req.body.meal_type || "",
            from_date: req.body.from_date || "",
            to_date: req.body.to_date || ""
        };

        try {
            const {
                first_name,
                last_name,
                email,
                password,
                confirm_password,
                phone,
                address,
                role,
                meal_type,
                from_date,
                to_date,
                accept_terms
            } = req.body;

            /*
            =========================================
            REQUIRED FIELD VALIDATION
            =========================================
            */

            if (
                !first_name ||
                !last_name ||
                !email ||
                !password ||
                !confirm_password ||
                !phone ||
                !address ||
                !role
            ) {
                return res.status(400).render("register", {
                    error: "Please enter all required details.",
                    success: null,
                    formData
                });
            }

            const normalizedRole = role.trim().toLowerCase();

            if (!["student", "mess"].includes(normalizedRole)) {
                return res.status(400).render("register", {
                    error: "Please select Student or Mess registration.",
                    success: null,
                    formData
                });
            }

            if (password.length < 6) {
                return res.status(400).render("register", {
                    error: "Password must contain at least 6 characters.",
                    success: null,
                    formData
                });
            }

            if (password !== confirm_password) {
                return res.status(400).render("register", {
                    error: "Password and confirm password do not match.",
                    success: null,
                    formData
                });
            }

            if (accept_terms !== "yes") {
                return res.status(400).render("register", {
                    error: "You must accept the terms and conditions.",
                    success: null,
                    formData
                });
            }

            const cleanEmail = email.trim().toLowerCase();
            const cleanPhone = phone.replace(/\D/g, "").trim();

            const fullName = `${first_name.trim()} ${last_name.trim()}`;

            if (!isValidEmail(cleanEmail)) {
                return res.status(400).render("register", {
                    error: "Please enter a valid email address.",
                    success: null,
                    formData
                });
            }

            if (!/^[0-9]{10}$/.test(cleanPhone)) {
                return res.status(400).render("register", {
                    error: "Please enter a valid 10-digit phone number.",
                    success: null,
                    formData
                });
            }

            /*
            =========================================
            CHECK EMAIL IN BOTH TABLES
            =========================================
            */

            const [existingStudent] = await db.query(
                `SELECT id
                 FROM students
                 WHERE email = ?
                 LIMIT 1`,
                [cleanEmail]
            );

            const [existingMess] = await db.query(
                `SELECT id
                 FROM guest_students
                 WHERE email = ?
                 LIMIT 1`,
                [cleanEmail]
            );

            if (
                existingStudent.length > 0 ||
                existingMess.length > 0
            ) {
                return res.status(409).render("register", {
                    error:
                        "This email is already registered. Please login or use another email.",
                    success: null,
                    formData
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            /*
            =========================================
            MESS REGISTRATION
            =========================================
            */

            if (normalizedRole === "mess") {
                if (!from_date || !to_date) {
                    return res.status(400).render("register", {
                        error:
                            "Please select the mess starting date and ending date.",
                        success: null,
                        formData
                    });
                }

                const startDate = new Date(from_date);
                const endDate = new Date(to_date);

                if (
                    Number.isNaN(startDate.getTime()) ||
                    Number.isNaN(endDate.getTime())
                ) {
                    return res.status(400).render("register", {
                        error: "Please select valid mess dates.",
                        success: null,
                        formData
                    });
                }

                if (endDate < startDate) {
                    return res.status(400).render("register", {
                        error:
                            "Mess ending date cannot be earlier than the starting date.",
                        success: null,
                        formData
                    });
                }

                const selectedMealType =
                    meal_type && meal_type.trim()
                        ? meal_type.trim()
                        : "Full Day";

                let messAmount = 5500;

                if (selectedMealType === "Breakfast") {
                    messAmount = 1800;
                } else if (selectedMealType === "Lunch") {
                    messAmount = 2200;
                } else if (selectedMealType === "Dinner") {
                    messAmount = 2200;
                } else if (selectedMealType === "Lunch and Dinner") {
                    messAmount = 4200;
                } else if (selectedMealType === "Full Day") {
                    messAmount = 5500;
                }

                await db.query(
                    `INSERT INTO guest_students
                    (
                        name,
                        phone,
                        email,
                        password,
                        meal_type,
                        amount,
                        from_date,
                        to_date,
                        status,
                        approval_status
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        fullName,
                        cleanPhone,
                        cleanEmail,
                        hashedPassword,
                        selectedMealType,
                        messAmount,
                        from_date,
                        to_date,
                        "Active",
                        "Pending"
                    ]
                );

                try {
                    await sendRegistrationEmail({
                        name: fullName,
                        email: cleanEmail,
                        registrationType: "Mess Student"
                    });
                } catch (emailError) {
                    console.error(
                        "Mess registration email failed:",
                        emailError.message
                    );
                }

                return res.render("registration-success", {
                    studentName: fullName,
                    email: cleanEmail,
                    registrationType: "Mess Student",
                    approvalStatus: "Pending",
                    successMessage:
                        "Your mess registration has been submitted successfully. Please wait for admin approval."
                });
            }

            /*
            =========================================
            PG STUDENT REGISTRATION
            =========================================
            */

            const paymentProof = req.file
                ? req.file.filename
                : null;

            await db.query(
                `INSERT INTO students
                (
                    first_name,
                    last_name,
                    email,
                    password,
                    phone,
                    address,
                    payment_proof,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    first_name.trim(),
                    last_name.trim(),
                    cleanEmail,
                    hashedPassword,
                    cleanPhone,
                    address.trim(),
                    paymentProof,
                    "Pending"
                ]
            );

            try {
                await sendRegistrationEmail({
                    name: fullName,
                    email: cleanEmail,
                    registrationType: "PG Student"
                });
            } catch (emailError) {
                console.error(
                    "Student registration email failed:",
                    emailError.message
                );
            }

            return res.render("registration-success", {
                studentName: fullName,
                email: cleanEmail,
                registrationType: "PG Student",
                approvalStatus: "Pending",
                successMessage:
                    "Your PG registration has been submitted successfully. Please wait for admin approval."
            });

        } catch (error) {
            console.error("Registration error:", error);

            if (error.code === "ER_DUP_ENTRY") {
                return res.status(409).render("register", {
                    error:
                        "This email is already registered. Please login or use another email.",
                    success: null,
                    formData
                });
            }

            if (error instanceof multer.MulterError) {
                return res.status(400).render("register", {
                    error: "File upload failed: " + error.message,
                    success: null,
                    formData
                });
            }

            return res.status(500).render("register", {
                error:
                    "Registration failed. Please check your details and try again.",
                success: null,
                formData
            });
        }
    }
);
// ----------------------------
// LOGIN PAGE
// ----------------------------

app.get("/login", (req, res) => {

    res.render("login");

});

// ----------------------------
// LOGIN
// ----------------------------
// Make sure this exists near the top of server.js


async function checkPassword(enteredPassword, storedPassword) {
    if (!storedPassword) {
        return false;
    }

    const savedPassword = String(storedPassword);

    // Hashed bcrypt password
    if (
        savedPassword.startsWith("$2a$") ||
        savedPassword.startsWith("$2b$") ||
        savedPassword.startsWith("$2y$")
    ) {
        return bcrypt.compare(enteredPassword, savedPassword);
    }

    // Existing plain-text password
    return enteredPassword === savedPassword;
}

app.post("/login", async (req, res) => {
    try {
        const cleanEmail = String(req.body.email || "")
            .trim()
            .toLowerCase();

        // Do not trim passwords because spaces may be part of a password
        const password = String(req.body.password || "");

        if (!cleanEmail || !password) {
            return res.status(400).send(`
                <script>
                    alert("Please enter email and password.");
                    window.location.href = "/login";
                </script>
            `);
        }

        let accountWithEmailFound = false;

        /*
        ========================================
        1. MESS STUDENT LOGIN
        ========================================
        */

        const [messRows] = await db.query(
            `SELECT *
             FROM guest_students
             WHERE LOWER(TRIM(email)) = ?
             LIMIT 1`,
            [cleanEmail]
        );

        if (messRows.length > 0) {
            accountWithEmailFound = true;

            const mess = messRows[0];

            const messPasswordMatch = await checkPassword(
                password,
                mess.password
            );

            if (messPasswordMatch) {
                const approvalStatus = String(
                    mess.approval_status || "Pending"
                ).trim();

                if (approvalStatus.toLowerCase() !== "approved") {
                    return res.render("approval-pending", {
                        studentName:
                            mess.name ||
                            mess.guest_name ||
                            "Mess Student",
                        email: mess.email,
                        registrationType: "Mess Student",
                        approvalStatus: approvalStatus
                    });
                }

                // Remove other login sessions
                delete req.session.admin;
                delete req.session.student;
                delete req.session.user;

                req.session.mess = {
                    id: mess.id,
                    name:
                        mess.name ||
                        mess.guest_name ||
                        "Mess Student",
                    email: mess.email,
                    role: "Mess"
                };

                return req.session.save((sessionError) => {
                    if (sessionError) {
                        console.error(
                            "Mess session save error:",
                            sessionError
                        );

                        return res.status(500).send(
                            "Login succeeded, but session could not be saved."
                        );
                    }

                    return res.redirect("/mess/dashboard");
                });
            }
        }

        /*
        ========================================
        2. PG STUDENT LOGIN
        ========================================
        */

        const [studentRows] = await db.query(
            `SELECT *
             FROM students
             WHERE LOWER(TRIM(email)) = ?
             LIMIT 1`,
            [cleanEmail]
        );

        if (studentRows.length > 0) {
            accountWithEmailFound = true;

            const student = studentRows[0];

            const studentPasswordMatch = await checkPassword(
                password,
                student.password
            );

            if (studentPasswordMatch) {
                const approvalStatus = String(
                    student.status || "Pending"
                ).trim();

                if (approvalStatus.toLowerCase() !== "approved") {
                    return res.render("approval-pending", {
                        studentName:
                            `${student.first_name || ""} ${
                                student.last_name || ""
                            }`.trim() || "Student",
                        email: student.email,
                        registrationType: "PG Student",
                        approvalStatus: approvalStatus
                    });
                }

                delete req.session.admin;
                delete req.session.mess;
                delete req.session.user;

                req.session.student = {
                    id: student.id,
                    name:
                        `${student.first_name || ""} ${
                            student.last_name || ""
                        }`.trim() || "Student",
                    email: student.email,
                    role: "Student"
                };

                return req.session.save((sessionError) => {
                    if (sessionError) {
                        console.error(
                            "Student session save error:",
                            sessionError
                        );

                        return res.status(500).send(
                            "Login succeeded, but session could not be saved."
                        );
                    }

                    return res.redirect("/student/dashboard");
                });
            }
        }

        /*
        ========================================
        3. ADMIN LOGIN
        ========================================
        */

        const [adminRows] = await db.query(
            `SELECT *
             FROM admin
             WHERE LOWER(TRIM(email)) = ?
             LIMIT 1`,
            [cleanEmail]
        );

        if (adminRows.length > 0) {
            accountWithEmailFound = true;

            const admin = adminRows[0];

            const adminPasswordMatch = await checkPassword(
                password,
                admin.password
            );

            if (adminPasswordMatch) {
                delete req.session.student;
                delete req.session.mess;
                delete req.session.user;

                req.session.admin = {
                    id: admin.id,
                    name: admin.name || "Admin",
                    email: admin.email,
                    role: "Admin"
                };

                return req.session.save((sessionError) => {
                    if (sessionError) {
                        console.error(
                            "Admin session save error:",
                            sessionError
                        );

                        return res.status(500).send(
                            "Login succeeded, but session could not be saved."
                        );
                    }

                    return res.redirect("/admin/dashboard");
                });
            }
        }

        /*
        ========================================
        LOGIN FAILED
        ========================================
        */

        if (accountWithEmailFound) {
            return res.status(401).send(`
                <script>
                    alert("Invalid password.");
                    window.location.href = "/login";
                </script>
            `);
        }

        return res.status(404).send(`
            <script>
                alert("No account found with this email.");
                window.location.href = "/login";
            </script>
        `);
    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).send(`
            <script>
                alert("Login failed. Please try again.");
                window.location.href = "/login";
            </script>
        `);
    }
});
// ----------------------------
// LOGOUT
// ----------------------------

app.get("/logout", (req, res) => {

    req.session.destroy((err) => {

        if (err) {
            return res.send("Logout Error");
        }

        res.redirect("/login");

    });

});

// ----------------------------
// FORGOT PASSWORD PAGE
// ----------------------------





app.get("/forgotpassword", (req, res) => {

    res.render("forgotpassword");

});

// ----------------------------
// SEND OTP
// ----------------------------

app.post("/forgotpassword", async (req, res) => {

    try {

        const { email } = req.body;

        const [student] = await db.query(
            "SELECT * FROM students WHERE email=?",
            [email]
        );

        if (student.length === 0) {
            return res.send("Email not found");
        }

        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + 10);

        await db.query(
            "INSERT INTO password_resets(email,otp,expires_at) VALUES(?,?,?)",
            [email, otp, expiry]
        );

        await transporter.sendMail({

            from: `"Rahma Pearl PG" <${process.env.EMAIL_USER}>`,

            to: email,

            subject: "Password Reset OTP",

            html: `
                <h2>Rahma Pearl PG</h2>

                <h3>Your OTP is</h3>

                <h1>${otp}</h1>

                <p>This OTP is valid for 10 minutes.</p>
            `

        });

        res.render("verify-otp", {
            email
        });

    } catch (err) {

        console.log(err);

        res.send(err.message);

    }

});

// ----------------------------
// VERIFY OTP
// ----------------------------

app.post("/verify-otp", async (req, res) => {

    try {

        const { email, otp } = req.body;

        const [rows] = await db.query(

            `SELECT *
             FROM password_resets
             WHERE email=?
             AND otp=?
             AND expires_at>NOW()
             ORDER BY id DESC
             LIMIT 1`,

            [email, otp]

        );

        if (rows.length === 0) {
            return res.send("Invalid OTP");
        }

        res.render("reset-password", {
            email
        });

    } catch (err) {

        console.log(err);

        res.send(err.message);

    }

});
// ----------------------------
// RESET PASSWORD
// ----------------------------

app.post("/reset-password", async (req, res) => {

    try {

        const {

            email,
            password,
            confirmPassword

        } = req.body;

        if (password !== confirmPassword) {
            return res.send("Passwords do not match");
        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        await db.query(

            "UPDATE students SET password=? WHERE email=?",

            [hashedPassword, email]

        );

        await db.query(

            "DELETE FROM password_resets WHERE email=?",

            [email]

        );

        res.send(`
            <h2>Password Updated Successfully</h2>

            <a href="/login">
                Go To Login
            </a>
        `);

    } catch (err) {

        console.log(err);

        res.send(err.message);

    }

});
// ----------------------------
// ADMIN LOGIN PAGE
// ----------------------------

app.get("/admin/login", (req, res) => {

    res.render("admin_login");

});

// ----------------------------
// STUDENT LOGIN PAGE
// ----------------------------

app.get("/student/login", (req, res) => {

    res.render("login_student");

});
// ======================================================
// PART 1C
// ADMIN DASHBOARD
// SESSION UTILITIES
// ======================================================

// ------------------------------------
// ADMIN DASHBOARD
// ------------------------------------

app.get("/admin/dashboard", isAdmin, async (req, res) => {
    try {
        const [[studentCount]] = await db.query(
            "SELECT COUNT(*) AS total FROM students"
        );

        const [[roomCount]] = await db.query(
            "SELECT COUNT(*) AS total FROM rooms"
        );

        const [[occupiedRooms]] = await db.query(
            "SELECT SUM(occupied) AS occupied FROM rooms"
        );

        const [[income]] = await db.query(
            "SELECT SUM(amount) AS total FROM payments WHERE status='Approved'"
        );

        const [[expense]] = await db.query(
            "SELECT SUM(amount) AS total FROM expenses"
        );

        const [[complaints]] = await db.query(
            "SELECT COUNT(*) AS total FROM complaints WHERE status='Pending'"
        );

        const [[messCount]] = await db.query(
            "SELECT COUNT(*) AS total FROM guest_students WHERE approval_status='Approved'"
        );

        const [rooms] = await db.query(
            "SELECT room_number, occupied FROM rooms"
        );

        const [recentPayments] = await db.query(`
            SELECT student_email, amount, status, created_at
            FROM payments
            ORDER BY id DESC
            LIMIT 10
        `);

        res.render("admin_dashboard", {
            admin: req.session.admin,

            totalStudents: studentCount.total || 0,
            totalRooms: roomCount.total || 0,
            occupiedRooms: occupiedRooms.occupied || 0,
            totalIncome: income.total || 0,
            totalExpense: expense.total || 0,
            profit: (income.total || 0) - (expense.total || 0),
            pendingComplaints: complaints.total || 0,
            totalMess: messCount.total || 0,

            rooms,
            recentPayments,
            predictedIncome: 0,
            activities: []
        });

    } catch (err) {
        console.error("ADMIN DASHBOARD ERROR:", err);
        res.status(500).send(err.message);
    }
});
// ------------------------------------
// ADMIN PROFILE
// ------------------------------------

app.get("/admin/profile", isAdmin, async (req, res) => {

    const [admin] = await db.query(

        "SELECT * FROM admin WHERE id=?",

        [req.session.admin.id]

    );

    res.render("admin_profile", {

        admin: admin[0]

    });

});

// ------------------------------------
// UPDATE ADMIN PROFILE
// ------------------------------------

app.post("/admin/profile", isAdmin, async (req, res) => {

    const {

        name,

        email

    } = req.body;

    await db.query(

        `UPDATE admin
         SET name=?, email=?
         WHERE id=?`,

        [

            name,

            email,

            req.session.admin.id

        ]

    );

    req.session.admin.name = name;

    req.session.admin.email = email;

    res.redirect("/admin/profile");

});

// ------------------------------------
// CHANGE PASSWORD PAGE
// ------------------------------------

app.get("/admin/change-password",

isAdmin,

(req, res) => {

    res.render("change_password");

});

// ------------------------------------
// CHANGE PASSWORD
// ------------------------------------

app.post("/admin/change-password",

isAdmin,

async (req, res) => {

    const {

        oldPassword,

        newPassword,

        confirmPassword

    } = req.body;

    if (newPassword !== confirmPassword) {

        return res.send("Passwords do not match.");

    }

    const [admin] = await db.query(

        "SELECT * FROM admin WHERE id=?",

        [

            req.session.admin.id

        ]

    );

    if (admin.length === 0) {

        return res.send("Admin not found.");

    }

    if (admin[0].password !== oldPassword) {

        return res.send("Old password incorrect.");

    }

    await db.query(

        "UPDATE admin SET password=? WHERE id=?",

        [

            newPassword,

            req.session.admin.id

        ]

    );

    res.send("Password Updated Successfully.");

});

// ------------------------------------
// SESSION CHECK API
// ------------------------------------

app.get("/session", (req, res) => {

    res.json({

        admin: req.session.admin || null,

        student: req.session.student || null

    });

});

// ------------------------------------
// ADMIN LIVE DASHBOARD API
// ------------------------------------

app.get("/admin/live-data",

isAdmin,

async (req, res) => {

    const [[students]] = await db.query(
        "SELECT COUNT(*) total FROM students"
    );

    const [[income]] = await db.query(
        "SELECT SUM(amount) total FROM payments WHERE status='Approved'"
    );

    const [[expense]] = await db.query(
        "SELECT SUM(amount) total FROM expenses"
    );

    const [[rooms]] = await db.query(
        "SELECT COUNT(*) total FROM rooms"
    );

    const [[occupied]] = await db.query(
        "SELECT SUM(occupied) total FROM rooms"
    );

    res.json({

        students: students.total || 0,

        income: income.total || 0,

        expense: expense.total || 0,

        rooms: rooms.total || 0,

        occupied: occupied.total || 0

    });

});

// ------------------------------------
// NOTIFICATIONS API
// ------------------------------------

app.get("/admin/notifications",

isAdmin,

async (req, res) => {

    const [[complaints]] = await db.query(

        "SELECT COUNT(*) total FROM complaints WHERE status='Pending'"

    );

    const [[payments]] = await db.query(

        "SELECT COUNT(*) total FROM payments WHERE status='Pending'"

    );

    res.json({

        complaints: complaints.total || 0,

        payments: payments.total || 0

    });

});

// ------------------------------------
// ADMIN LOGOUT
// ------------------------------------

app.get("/admin/logout",

(req, res) => {

    req.session.destroy(() => {

        res.redirect("/login");

    });

});

// ------------------------------------
// STUDENT LOGOUT
// ------------------------------------

app.get("/student/logout",

(req, res) => {

    req.session.destroy(() => {

        res.redirect("/login");

    });

});
// ======================================================
// PART 2A-1
// STUDENT MANAGEMENT (CRUD)
// ======================================================

// -----------------------------------------
// VIEW ALL STUDENTS
// -----------------------------------------

app.get("/admin/students", isAdmin, async (req, res) => {
    try {
        const [students] = await db.query(`
            SELECT
                id,
                first_name,
                last_name,
                email,
                phone,
                room_number,
                status,
                admission_date
            FROM students
            ORDER BY id DESC
        `);

        res.render("admin_students", {
            admin: req.session.admin,
            students
        });

    } catch (err) {
        console.error("STUDENTS LOAD ERROR:", err);
        res.status(500).send(err.message);
    }
});

// -----------------------------------------
// ADD STUDENT PAGE
// -----------------------------------------
app.get("/admin/students/add", isAdmin, async (req, res) => {
    try {
        const [rooms] = await db.query(`
            SELECT room_number 
            FROM rooms 
            ORDER BY room_number
        `);

        res.render("admin_add_student", {
            admin: req.session.admin,
            rooms
        });

    } catch (err) {
        console.error("ADD STUDENT PAGE ERROR:", err);
        res.status(500).send(err.message);
    }
});



// -----------------------------------------
// ADD STUDENT
// -----------------------------------------
app.post("/admin/students/add", isAdmin, async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            email,
            password,
            phone,
            address,
            room_number
        } = req.body;

        if (!password) {
            return res.send("Password is missing. Please enter password in form.");
        }

        const [existing] = await db.query(
            "SELECT id FROM students WHERE email=?",
            [email]
        );

        if (existing.length > 0) {
            return res.send("Email already exists.");
        }

        const hash = await bcrypt.hash(password, 10);

        await db.query(
            `INSERT INTO students
            (first_name, last_name, email, password, phone, address, room_number, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                first_name,
                last_name,
                email,
                hash,
                phone,
                address,
                room_number,
                "Approved"
            ]
        );

        res.redirect("/admin/students");

    } catch (err) {
        console.log(err);
             return res.render("error-message",{

             title:"Registration Failed",

             heading:"Student Already Registered",

             message:"An account already exists with this email address. Please use another email address or login using your existing account."

            });
    }
});

// -----------------------------------------
// VIEW STUDENT
// -----------------------------------------

app.get("/admin/students/view/:id", isAdmin, async (req, res) => {

    try {

        const [student] = await db.query(

            "SELECT * FROM students WHERE id=?",

            [req.params.id]

        );

        if (student.length === 0) {

            return res.send("Student not found.");

        }

        res.render("student_view", {

            student: student[0]

        });

    }

    catch (err) {

        console.log(err);

        res.send("Database Error");

    }

});

// -----------------------------------------
// EDIT PAGE
// -----------------------------------------

app.get("/admin/students/edit/:id", isAdmin, async (req, res) => {

    const [[student]] = await db.query(
        "SELECT * FROM students WHERE id=?",
        [req.params.id]
    );

    const [rooms] = await db.query(
        "SELECT room_number FROM rooms ORDER BY room_number"
    );

    res.render("edit_student", {
        student,
        rooms
    });

});



app.post("/admin/students/edit/:id", isAdmin, async (req, res) => {
    try {

        const studentId = req.params.id;

        const {
            first_name,
            last_name,
            email,
            phone,
            address,
            room_number,
            status,
            password
        } = req.body;

        const cleanEmail = email.trim().toLowerCase();

        // Check duplicate email
        const [duplicateEmail] = await db.query(
            `SELECT id
             FROM students
             WHERE email = ?
             AND id != ?`,
            [cleanEmail, studentId]
        );

        if (duplicateEmail.length > 0) {
            return res.status(400).send(`
                <div style="
                    max-width:600px;
                    margin:60px auto;
                    padding:30px;
                    font-family:Arial;
                    border-radius:15px;
                    background:#fff3f3;
                    border:1px solid #efb5b5;
                    text-align:center;
                ">
                    <h2 style="color:#b42318;">
                        Email Already Registered
                    </h2>

                    <p>
                        The email
                        <strong>${cleanEmail}</strong>
                        is already used by another student.
                    </p>

                    <a href="/admin/students/edit/${studentId}"
                       style="
                            display:inline-block;
                            margin-top:15px;
                            padding:12px 22px;
                            background:#087f73;
                            color:white;
                            border-radius:8px;
                            text-decoration:none;
                       ">
                        Go Back
                    </a>
                </div>
            `);
        }

        // If password entered
        if (password && password.trim() !== "") {

            const hashedPassword = await bcrypt.hash(password, 10);

            await db.query(
                `UPDATE students
                 SET first_name=?,
                     last_name=?,
                     email=?,
                     phone=?,
                     address=?,
                     room_number=?,
                     status=?,
                     password=?
                 WHERE id=?`,
                [
                    first_name,
                    last_name,
                    cleanEmail,
                    phone,
                    address,
                    room_number,
                    status,
                    hashedPassword,
                    studentId
                ]
            );

        } else {

            await db.query(
                `UPDATE students
                 SET first_name=?,
                     last_name=?,
                     email=?,
                     phone=?,
                     address=?,
                     room_number=?,
                     status=?
                 WHERE id=?`,
                [
                    first_name,
                    last_name,
                    cleanEmail,
                    phone,
                    address,
                    room_number,
                    status,
                    studentId
                ]
            );

        }

        res.redirect("/admin/students");

    } catch (error) {

        console.error(error);

        res.status(500).send(error.message);

    }
});
app.post("/admin/students/update/:id", isAdmin, async (req, res) => {
    try {
        const studentId = req.params.id;

        const {
            first_name,
            last_name,
            email,
            phone,
            address,
            room_number,
            status
        } = req.body;

        if (!email) {
            return res.render("error-message", {
                title: "Update Failed",
                heading: "Email is Required",
                message:
                    "Please enter a valid email address before updating the student."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        // Check whether another student already uses this email
        const [existing] = await db.query(
            `SELECT id
             FROM students
             WHERE email = ?
             AND id <> ?`,
            [cleanEmail, studentId]
        );

        if (existing.length > 0) {
            return res.render("error-message", {
                title: "Update Failed",
                heading: "Email Already Registered",
                message:
                    "Another student is already registered with this email address. Please enter a different email address."
            });
        }

        const [result] = await db.query(
            `UPDATE students
             SET first_name = ?,
                 last_name = ?,
                 email = ?,
                 phone = ?,
                 address = ?,
                 room_number = ?,
                 status = ?
             WHERE id = ?`,
            [
                first_name,
                last_name,
                cleanEmail,
                phone,
                address,
                room_number,
                status,
                studentId
            ]
        );

        if (result.affectedRows === 0) {
            return res.render("error-message", {
                title: "Update Failed",
                heading: "Student Not Found",
                message:
                    "The selected student record could not be found."
            });
        }

        return res.redirect("/admin/students");

    } catch (err) {
        console.error("Student update error:", err);

        if (err.code === "ER_DUP_ENTRY") {
            return res.render("error-message", {
                title: "Update Failed",
                heading: "Email Already Registered",
                message:
                    "Another student already uses this email address. Please enter a different email."
            });
        }

        return res.status(500).render("error-message", {
            title: "Something Went Wrong",
            heading: "Unable to Update Student",
            message:
                "We could not update the student right now. Please try again later."
        });
    }
});

app.get("/admin/students/assign-room/:id", isAdmin, async (req, res) => {
    const [[student]] = await db.query("SELECT * FROM students WHERE id=?", [req.params.id]);
    const [rooms] = await db.query("SELECT * FROM rooms ORDER BY CAST(room_number AS UNSIGNED)");

    res.render("assign_room", { student, rooms });
});

app.post("/admin/students/assign-room/:id", isAdmin, async (req, res) => {
    try {

        const { room_number } = req.body;

        await db.query(
            "UPDATE students SET room_number=? WHERE id=?",
            [room_number, req.params.id]
        );

        // Update occupied count in rooms table (optional but recommended)
        await db.query(
            "UPDATE rooms SET occupied = occupied + 1 WHERE room_number=?",
            [room_number]
        );

        res.redirect("/admin/students");

    } catch (err) {
        console.log(err);
        res.send(err.message);
    }
});

app.get("/students", isAdmin, (req, res) => {
    res.redirect("/admin/students");
});

// -----------------------------------------
// UPDATE STUDENT
// -----------------------------------------

app.post("/admin/students/update/:id", isAdmin, async (req, res) => {

    try {

        const {

            first_name,
            last_name,
            phone,
            email,
            address,
            room_number

        } = req.body;

        await db.query(

            `
            UPDATE students
            SET
                first_name=?,
                last_name=?,
                phone=?,
                email=?,
                address=?,
                room_number=?
            WHERE id=?
            `,

            [

                first_name,
                last_name,
                phone,
                email,
                address,
                room_number,
                req.params.id

            ]

        );

        res.redirect("/admin/students");

    }

    catch (err) {

        console.log(err);

        res.send("Update Failed.");

    }

});

// -----------------------------------------
// DELETE STUDENT
// -----------------------------------------

app.post("/admin/students/delete/:id", isAdmin, async (req, res) => {

    try {

        await db.query(

            "DELETE FROM students WHERE id=?",

            [req.params.id]

        );

        res.redirect("/admin/students");

    }

    catch (err) {

        console.log(err);

        res.send("Delete Failed.");

    }

});

// -----------------------------------------
// APPROVE STUDENT
// -----------------------------------------

app.get("/admin/students/approve/:id", isAdmin, async (req, res) => {

    await db.query(

        "UPDATE students SET status='Approved' WHERE id=?",

        [req.params.id]

    );

    res.redirect("/admin/students");

});

app.post(
    "/admin/students/approve/:id",
    isAdmin,
    async (req, res) => {
        try {
            const studentId = req.params.id;

            const [rows] = await db.query(
                `SELECT
                    id,
                    first_name,
                    last_name,
                    email,
                    status
                 FROM students
                 WHERE id = ?`,
                [studentId]
            );

            if (rows.length === 0) {
                return res.status(404).send(
                    "Student not found."
                );
            }

            const student = rows[0];

            await db.query(
                `UPDATE students
                 SET status = 'Approved'
                 WHERE id = ?`,
                [studentId]
            );

            const fullName =
                `${student.first_name || ""} ${student.last_name || ""}`.trim();

            try {
                await sendApprovalEmail({
                    name: fullName || "Student",
                    email: student.email,
                    registrationType: "PG Student"
                });
            } catch (emailError) {
                console.error(
                    "Approval email failed:",
                    emailError.message
                );
            }

            return res.redirect("/admin/students");

        } catch (error) {
            console.error(
                "Student approval error:",
                error
            );

            return res.status(500).send(
                "Unable to approve student."
            );
        }
    }
);
// -----------------------------------------
// REJECT STUDENT
// -----------------------------------------

app.get("/admin/students/reject/:id", isAdmin, async (req, res) => {

    await db.query(

        "UPDATE students SET status='Rejected' WHERE id=?",

        [req.params.id]

    );

    res.redirect("/admin/students");

});

// -----------------------------------------
// SEARCH STUDENTS
// -----------------------------------------

app.get("/admin/students/search", isAdmin, async (req, res) => {

    try {

        const keyword = `%${req.query.q || ""}%`;

        const [students] = await db.query(

            `
            SELECT *
            FROM students
            WHERE
                first_name LIKE ?
                OR last_name LIKE ?
                OR email LIKE ?
                OR phone LIKE ?
            ORDER BY first_name
            `,

            [

                keyword,
                keyword,
                keyword,
                keyword

            ]

        );

        res.render("admin_students", {

            students,

            admin: req.session.admin

        });

    }

    catch (err) {

        console.log(err);

        res.send("Search Failed");

    }

});

// -----------------------------------------
// STUDENT DETAILS API
// -----------------------------------------

app.get("/api/student/:id", async (req, res) => {

    try {

        const [student] = await db.query(

            "SELECT * FROM students WHERE id=?",

            [req.params.id]

        );

        if (student.length === 0) {

            return res.json({

                success: false

            });

        }

        res.json({

            success: true,

            student: student[0]

        });

    }

    catch (err) {

        console.log(err);

        res.json({

            success: false

        });

    }

});
// ======================================================
// PART 2A-2
// STUDENT DASHBOARD & PROFILE
// ======================================================

// ------------------------------------
// STUDENT DASHBOARD
// ------------------------------------

app.get("/student/dashboard", isStudent, async (req, res) => {
    try {
        const email = req.session.student.email;

        const [[student]] = await db.query(
            "SELECT * FROM students WHERE email=?",
            [email]
        );

        const [payments] = await db.query(
            "SELECT * FROM payments WHERE student_email=? ORDER BY id DESC",
            [email]
        );

        const [complaints] = await db.query(
            "SELECT * FROM complaints WHERE student_email=? ORDER BY id DESC",
            [email]
        );

        res.render("student_dashboard", {
            student,
            payments,
            complaints,
            pendingPayment: payments.filter(p => p.status === "Pending").length,
            approvedPayment: payments.filter(p => p.status === "Approved").length,
            attendance: 0
        });

    } catch (err) {
        console.error("STUDENT DASHBOARD ERROR:", err);
        res.status(500).send(err.message);
    }
});
// ------------------------------------
// STUDENT PROFILE
// ------------------------------------

app.get("/student/profile", isStudent, async (req, res) => {

    const studentId = req.session.student.id;

    const [[student]] = await db.query(

        "SELECT * FROM students WHERE id=?",

        [studentId]

    );

    res.render("student_profile", {

        student

    });

});

// ------------------------------------
// EDIT PROFILE PAGE
// ------------------------------------

app.get("/student/profile/edit",

isStudent,

async (req, res) => {

    const [[student]] = await db.query(

        "SELECT * FROM students WHERE id=?",

        [req.session.student.id]

    );

    res.render("edit_student_profile", {

        student

    });

});

// ------------------------------------
// UPDATE PROFILE
// ------------------------------------

app.post(

"/student/profile/update",

isStudent,

upload.single("photo"),

async (req, res) => {

    try {

        const {

            first_name,

            last_name,

            phone,

            address

        } = req.body;

        let photo = null;

        if (req.file) {

            photo = req.file.filename;

        }

        if (photo) {

            await db.query(

                `UPDATE students
                 SET
                 first_name=?,
                 last_name=?,
                 phone=?,
                 address=?,
                 photo=?
                 WHERE id=?`,

                [

                    first_name,

                    last_name,

                    phone,

                    address,

                    photo,

                    req.session.student.id

                ]

            );

        }

        else {

            await db.query(

                `UPDATE students
                 SET
                 first_name=?,
                 last_name=?,
                 phone=?,
                 address=?
                 WHERE id=?`,

                [

                    first_name,

                    last_name,

                    phone,

                    address,

                    req.session.student.id

                ]

            );

        }

        req.session.student.first_name = first_name;
        req.session.student.last_name = last_name;

        res.redirect("/student/profile");

    }

    catch (err) {

        console.log(err);

        res.send("Update Failed");

    }

});

// ------------------------------------
// PAYMENT SUMMARY
// ------------------------------------

app.get("/student/payment-summary",

isStudent,

async (req, res) => {

    const studentId = req.session.student.id;

    const [payments] = await db.query(

        `SELECT *
         FROM payments
         WHERE student_id=?
         ORDER BY id DESC`,

        [

            studentId

        ]

    );

    res.render("student_payment_summary", {

        payments

    });

});

// ------------------------------------
// STUDENT NOTIFICATIONS
// ------------------------------------

app.get("/student/notifications",

isStudent,

async (req, res) => {

    const [notifications] = await db.query(

        `
        SELECT *
        FROM notifications
        ORDER BY id DESC
        LIMIT 30
        `

    );

    res.render("student_notifications", {

        notifications

    });

});

// ------------------------------------
// ATTENDANCE HISTORY
// ------------------------------------

app.get("/student/attendance",

isStudent,

async (req, res) => {

    const [attendance] = await db.query(

        `
        SELECT *
        FROM attendance
        WHERE student_id=?
        ORDER BY id DESC
        `,

        [

            req.session.student.id

        ]

    );

    res.render("student_attendance", {

        attendance

    });

});

// ------------------------------------
// TODAY ENTRY
// ------------------------------------

app.post("/student/entry",

isStudent,

async (req, res) => {

    await db.query(

        `
        INSERT INTO attendance
        (
            student_id,
            entry_time
        )
        VALUES(?,NOW())
        `,

        [

            req.session.student.id

        ]

    );

    res.redirect("/student/dashboard");

});

// ------------------------------------
// TODAY EXIT
// ------------------------------------

app.post("/student/exit",

isStudent,

async (req, res) => {

    await db.query(

        `
        UPDATE attendance
        SET exit_time=NOW()
        WHERE
        student_id=?
        AND exit_time IS NULL
        `,

        [

            req.session.student.id

        ]

    );

    res.redirect("/student/dashboard");

});

// ------------------------------------
// STUDENT API
// ------------------------------------

app.get("/api/student/dashboard",

isStudent,

async (req, res) => {

    const studentId = req.session.student.id;

    const [[payments]] = await db.query(

        `SELECT COUNT(*) total
         FROM payments
         WHERE student_id=?`,

        [

            studentId

        ]

    );

    const [[complaints]] = await db.query(

        `SELECT COUNT(*) total
         FROM complaints
         WHERE student_id=?`,

        [

            studentId

        ]

    );

    res.json({

        payments: payments.total,

        complaints: complaints.total

    });

});
// ======================================================
// PART 2A-3
// ROOM ALLOCATION & MANAGEMENT
// ======================================================

// ------------------------------------
// VIEW ALL ROOMS
// ------------------------------------

app.get("/admin/rooms", isAdmin, async (req, res) => {

    try {

        const [rooms] = await db.query(`
            SELECT *
            FROM rooms
            ORDER BY room_number
        `);

        res.render("admin_rooms", {
            rooms
        });

    } catch (err) {

        console.log(err);
        res.send("Unable to load rooms.");

    }

});

// ------------------------------------
// ADD ROOM
// ------------------------------------

app.post("/admin/rooms/add", isAdmin, async (req, res) => {

    try {

        const {

            room_number,
            capacity,
            rent

        } = req.body;

        await db.query(

            `INSERT INTO rooms
            (
                room_number,
                capacity,
                occupied,
                rent
            )
            VALUES(?,?,?,?)`,

            [

                room_number,

                capacity,

                0,

                rent

            ]

        );

        res.redirect("/admin/rooms");

    }

    catch (err) {

        console.log(err);

        res.send("Unable to add room.");

    }

});

// ------------------------------------
// AUTOMATIC ROOM ALLOCATION
// ------------------------------------

async function allocateRoom(studentId) {

    const [rooms] = await db.query(

        `
        SELECT *
        FROM rooms
        WHERE occupied < capacity
        ORDER BY room_number
        LIMIT 1
        `

    );

    if (rooms.length === 0) {

        return false;

    }

    const room = rooms[0];

    await db.query(

        `
        UPDATE students
        SET
            room_id=?,
            room_number=?
        WHERE id=?
        `,

        [

            room.id,

            room.room_number,

            studentId

        ]

    );

    await db.query(

        `
        UPDATE rooms
        SET occupied=occupied+1
        WHERE id=?
        `,

        [

            room.id

        ]

    );

    return true;

}

// ------------------------------------
// ALLOCATE ROOM TO STUDENT
// ------------------------------------

app.get("/admin/allocate-room/:id",

isAdmin,

async (req, res) => {

    const success = await allocateRoom(

        req.params.id

    );

    if (!success) {

        return res.send("No vacant room available.");

    }

    res.redirect("/admin/students");

});

// ------------------------------------
// CHANGE ROOM PAGE
// ------------------------------------

app.get("/admin/change-room/:id",

isAdmin,

async (req, res) => {

    const [[student]] = await db.query(

        "SELECT * FROM students WHERE id=?",

        [

            req.params.id

        ]

    );

    const [rooms] = await db.query(

        "SELECT * FROM rooms ORDER BY room_number"

    );

    res.render("change_room", {

        student,

        rooms

    });

});

// ------------------------------------
// UPDATE ROOM
// ------------------------------------

app.post("/admin/change-room/:id",

isAdmin,

async (req, res) => {

    const studentId = req.params.id;

    const newRoom = req.body.room_id;

    const [[student]] = await db.query(

        "SELECT * FROM students WHERE id=?",

        [

            studentId

        ]

    );

    if (student.room_id) {

        await db.query(

            `
            UPDATE rooms
            SET occupied=occupied-1
            WHERE id=?
            `,

            [

                student.room_id

            ]

        );

    }

    const [[room]] = await db.query(

        "SELECT * FROM rooms WHERE id=?",

        [

            newRoom

        ]

    );

    if (room.occupied >= room.capacity) {

        return res.send("Selected room is full.");

    }

    await db.query(

        `
        UPDATE students
        SET
        room_id=?,
        room_number=?
        WHERE id=?
        `,

        [

            room.id,

            room.room_number,

            studentId

        ]

    );

    await db.query(

        `
        UPDATE rooms
        SET occupied=occupied+1
        WHERE id=?
        `,

        [

            room.id

        ]

    );

    res.redirect("/admin/students");

});

// ------------------------------------
// ROOM OCCUPANCY
// ------------------------------------

app.get("/admin/room-occupancy",

isAdmin,

async (req, res) => {

    const [rooms] = await db.query(

        `
        SELECT
            room_number,
            capacity,
            occupied,
            rent
        FROM rooms
        ORDER BY room_number
        `

    );

    res.render("room_occupancy", {

        rooms

    });

});

// ------------------------------------
// ROOM VACANCY API
// ------------------------------------

app.get("/api/rooms",

async (req, res) => {

    const [rooms] = await db.query(

        `
        SELECT
            room_number,
            capacity,
            occupied,
            (capacity-occupied) AS available
        FROM rooms
        ORDER BY room_number
        `

    );

    res.json(rooms);

});

// ------------------------------------
// DELETE ROOM
// ------------------------------------

app.post("/admin/rooms/delete/:id",

isAdmin,

async (req, res) => {

    const roomId = req.params.id;

    const [[students]] = await db.query(

        `
        SELECT COUNT(*) total
        FROM students
        WHERE room_id=?
        `,

        [

            roomId

        ]

    );

    if (students.total > 0) {

        return res.send("Room contains students.");

    }

    await db.query(

        "DELETE FROM rooms WHERE id=?",

        [

            roomId

        ]

    );

    res.redirect("/admin/rooms");

});

// ------------------------------------
// APPROVE STUDENT
// ------------------------------------

app.get("/admin/students/approve/:id",

isAdmin,

async (req, res) => {

    await db.query(

        `
        UPDATE students
        SET status='Approved'
        WHERE id=?
        `,

        [

            req.params.id

        ]

    );

    await allocateRoom(req.params.id);

    res.redirect("/admin/students");

});

// ------------------------------------
// ROOM HEATMAP DATA
// ------------------------------------

app.get("/admin/room-status", isAdmin, async (req, res) => {
    try {
        const [rooms] = await db.query(`
            SELECT
                rooms.room_number,
                rooms.capacity,
                rooms.occupied,
                (rooms.capacity - rooms.occupied) AS vacant,
                GROUP_CONCAT(
                    CONCAT(students.first_name, ' ', students.last_name)
                    SEPARATOR ', '
                ) AS student_names
            FROM rooms
            LEFT JOIN students
            ON students.room_number = rooms.room_number
            GROUP BY rooms.id
            ORDER BY CAST(rooms.room_number AS UNSIGNED)
        `);

        res.render("room_status", { rooms });

    } catch (err) {
        console.log(err);
        res.send(err.message);
    }
});
/* ===========================================================
   PART 2B-1
   STUDENT DASHBOARD & PAYMENT MODULE
=========================================================== */

// ============================================
// Student Dashboard
// ============================================

app.get("/student/dashboard", async (req, res) => {

    if (!req.session.student) {
        return res.redirect("/login");
    }

    try {

        const studentId = req.session.student.id;

        const [[student]] = await db.query(
            "SELECT * FROM students WHERE id=?",
            [studentId]
        );

        const [payments] = await db.query(
            "SELECT * FROM payments WHERE student_id=? ORDER BY id DESC LIMIT 5",
            [studentId]
        );

        const [complaints] = await db.query(
            "SELECT * FROM complaints WHERE student_id=? ORDER BY id DESC LIMIT 5",
            [studentId]
        );

        const [room] = await db.query(
            `SELECT rooms.*
             FROM rooms
             JOIN students
             ON rooms.id = students.room_id
             WHERE students.id=?`,
            [studentId]
        );

        res.render("student_dashboard", {
            student,
            room: room[0] || null,
            payments,
            complaints
        });

    } catch (err) {
        console.log(err);
        res.send("Dashboard Error");
    }

});


// ============================================
// Student Profile
// ============================================

app.get("/student/profile", async (req, res) => {

    if (!req.session.student) {
        return res.redirect("/login");
    }

    try {

        const [[student]] = await db.query(
            "SELECT * FROM students WHERE id=?",
            [req.session.student.id]
        );

        res.render("student_profile", {
            student
        });

    } catch (err) {
        console.log(err);
        res.send("Profile Error");
    }

});


// ============================================
// Update Profile
// ============================================

app.post("/student/profile/update", async (req, res) => {

    try {

        const {
            first_name,
            last_name,
            phone,
            address
        } = req.body;

        await db.query(
            `UPDATE students
             SET first_name=?,
                 last_name=?,
                 phone=?,
                 address=?
             WHERE id=?`,
            [
                first_name,
                last_name,
                phone,
                address,
                req.session.student.id
            ]
        );

        res.redirect("/student/profile");

    } catch (err) {

        console.log(err);
        res.send("Update Error");

    }

});


// ============================================
// Student Room Details
// ============================================

app.get("/student/room", async (req, res) => {

    try {

        const [room] = await db.query(
            `
            SELECT rooms.*
            FROM rooms
            JOIN students
            ON students.room_id=rooms.id
            WHERE students.id=?
            `,
            [req.session.student.id]
        );

        res.render("student_room", {
            room: room[0]
        });

    } catch (err) {

        console.log(err);
        res.send("Room Error");

    }

});


// ============================================
// Book Room
// ============================================

app.post("/student/book-room", async (req, res) => {

    try {

        const { room_id } = req.body;

        await db.query(
            `
            INSERT INTO bookings
            (
                student_id,
                room_id,
                status
            )
            VALUES
            (
                ?,?,
                'Pending'
            )
            `,
            [
                req.session.student.id,
                room_id
            ]
        );

        res.send("Room Booking Request Sent");

    } catch (err) {

        console.log(err);
        res.send("Booking Failed");

    }

});


// ============================================
// Payment Page
// ============================================

app.get("/student/payment", async (req, res) => {

    res.render("student_payment");

});


// ============================================
// Upload Rent Payment
// ============================================

app.post(
    "/student/payment",
    upload.single("screenshot"),
    async (req, res) => {

        try {

            const {
                amount
            } = req.body;

            let screenshot = "";

            if (req.file) {
                screenshot = req.file.filename;
            }

            await db.query(
                `
                INSERT INTO payments
                (
                    student_id,
                    amount,
                    screenshot,
                    status,
                    created_at
                )
                VALUES
                (
                    ?,?,
                    ?,
                    'Pending',
                    NOW()
                )
                `,
                [
                    req.session.student.id,
                    amount,
                    screenshot
                ]
            );

            res.redirect("/student/payments");

        } catch (err) {

            console.log(err);
            res.send("Payment Upload Error");

        }

    }
);


// ============================================
// Student Payment History
// ============================================

app.get("/student/payments", async (req, res) => {

    try {

        const [payments] = await db.query(
            `
            SELECT *
            FROM payments
            WHERE student_id=?
            ORDER BY id DESC
            `,
            [req.session.student.id]
        );

        res.render("student_payments", {
            payments
        });

    } catch (err) {

        console.log(err);
        res.send("Payment History Error");

    }

});
/* ===========================================================
   PART 2B-2
   PAYMENT MANAGEMENT & RECEIPTS
=========================================================== */

// ============================================
// Admin Payment List
// ============================================

app.get("/admin/payments", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login");
    }

    try {

        const [payments] = await db.query(`
            SELECT
                payments.*,
                students.first_name,
                students.last_name,
                students.room_id
            FROM payments
            LEFT JOIN students
            ON students.id = payments.student_id
            ORDER BY payments.id DESC
        `);

        res.render("admin_payments", {
            payments
        });

    } catch (err) {

        console.log(err);
        res.send("Payment Fetch Error");

    }

});


// ============================================
// Approve Payment
// ============================================

app.post("/admin/payment/approve/:id", async (req, res) => {

    try {

        await db.query(
            `UPDATE payments
             SET status='Approved'
             WHERE id=?`,
            [req.params.id]
        );

        res.redirect("/admin/payments");

    } catch (err) {

        console.log(err);
        res.send("Approval Failed");

    }

});


// ============================================
// Reject Payment
// ============================================

app.post("/admin/payment/reject/:id", async (req, res) => {

    try {

        await db.query(
            `UPDATE payments
             SET status='Rejected'
             WHERE id=?`,
            [req.params.id]
        );

        res.redirect("/admin/payments");

    } catch (err) {

        console.log(err);
        res.send("Reject Failed");

    }

});


// ============================================
// Verify Payment
// ============================================

app.post("/admin/payment/verify/:id", async (req, res) => {

    try {

        await db.query(
            `UPDATE payments
             SET status='Verified'
             WHERE id=?`,
            [req.params.id]
        );

        res.redirect("/admin/payments");

    } catch (err) {

        console.log(err);
        res.send("Verification Failed");

    }

});


// ============================================
// Payment Details
// ============================================

app.get("/payment/:id", async (req, res) => {

    try {

        const [[payment]] = await db.query(
            `
            SELECT
                payments.*,
                students.first_name,
                students.last_name,
                students.email
            FROM payments
            JOIN students
            ON students.id=payments.student_id
            WHERE payments.id=?
            `,
            [req.params.id]
        );

        res.render("payment_details", {
            payment
        });

    } catch (err) {

        console.log(err);
        res.send("Payment Not Found");

    }

});


// ============================================
// Payment Receipt PDF
// ============================================

app.get("/payment/receipt/:id", async (req, res) => {

    try {

        const [[payment]] = await db.query(`
            SELECT
                payments.*,
                students.first_name,
                students.last_name,
                students.email
            FROM payments
            JOIN students
            ON students.id=payments.student_id
            WHERE payments.id=?
        `, [req.params.id]);

        const doc = new PDFDocument();

        res.setHeader(
            "Content-Disposition",
            "attachment; filename=Receipt.pdf"
        );

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        doc.pipe(res);

        doc.fontSize(22).text("Rahma Pearl PG", {
            align: "center"
        });

        doc.moveDown();

        doc.fontSize(16).text("PAYMENT RECEIPT");

        doc.moveDown();

        doc.text("Receipt No : " + payment.id);
        doc.text("Student : " + payment.first_name + " " + payment.last_name);
        doc.text("Email : " + payment.email);
        doc.text("Amount : ₹" + payment.amount);
        doc.text("Status : " + payment.status);
        doc.text("Date : " + payment.created_at);

        doc.moveDown();

        doc.text("Thank you for your payment.");

        doc.end();

    } catch (err) {

        console.log(err);
        res.send("Receipt Error");

    }

});


// ============================================
// Student Rent History
// ============================================

app.get("/student/rent-history", isStudent, async (req, res) => {
    try {
        const email = req.session.student.email;

        const [payments] = await db.query(
            "SELECT * FROM payments WHERE student_email = ? ORDER BY id DESC",
            [email]
        );

        res.render("rent_history", {
            payments: payments || []
        });

    } catch (err) {
        console.error(err);
        res.render("rent_history", {
            payments: []
        });
    }
});

// ============================================
// Monthly Rent Generator
// ============================================

cron.schedule("0 0 1 * *", async () => {

    try {

        const [students] = await db.query(
            "SELECT id FROM students"
        );

        for (const student of students) {

            await db.query(
                `
                INSERT INTO payments
                (
                    student_id,
                    amount,
                    status,
                    created_at
                )
                VALUES
                (
                    ?,
                    5500,
                    'Pending',
                    NOW()
                )
                `,
                [student.id]
            );

        }

        console.log("Monthly Rent Generated");

    } catch (err) {

        console.log(err);

    }

});


// ============================================
// EMI Calculator
// ============================================

app.get("/emi", (req, res) => {

    res.render("emi", {
        emi: null
    });

});

app.post("/emi", (req, res) => {

    const {
        amount,
        rate,
        months
    } = req.body;

    const r = rate / 12 / 100;

    const emi =
        (amount * r * Math.pow(1 + r, months)) /
        (Math.pow(1 + r, months) - 1);

    res.render("emi", {
        emi: Math.round(emi)
    });

});


// ============================================
// QR Payment Page
// ============================================

app.get("/qr-payment", (req, res) => {

    res.render("qr_payment");

});


// ============================================
// Admission Payment Upload
// ============================================

app.post(
    "/admission-payment",
    upload.single("screenshot"),
    async (req, res) => {

        try {

            await db.query(
                `
                INSERT INTO admission_payments
                (
                    student_email,
                    amount,
                    screenshot,
                    status
                )
                VALUES
                (
                    ?,?,
                    ?,
                    'Pending'
                )
                `,
                [
                    req.body.email,
                    req.body.amount,
                    req.file ? req.file.filename : ""
                ]
            );

            res.send("Admission Payment Submitted");

        } catch (err) {

            console.log(err);
            res.send("Upload Failed");

        }

    }

);
/* ===========================================================
   PART 2B-2
   PAYMENT MANAGEMENT & RECEIPTS
=========================================================== */

// ============================================
// Admin Payment List
// ============================================

app.get("/admin/payments", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login");
    }

    try {

        const [payments] = await db.query(`
            SELECT
                payments.*,
                students.first_name,
                students.last_name,
                students.room_id
            FROM payments
            LEFT JOIN students
            ON students.id = payments.student_id
            ORDER BY payments.id DESC
        `);

        res.render("admin_payments", {
            payments
        });

    } catch (err) {

        console.log(err);
        res.send("Payment Fetch Error");

    }

});


// ============================================
// Approve Payment
// ============================================

app.post("/admin/payment/approve/:id", async (req, res) => {

    try {

        await db.query(
            `UPDATE payments
             SET status='Approved'
             WHERE id=?`,
            [req.params.id]
        );

        res.redirect("/admin/payments");

    } catch (err) {

        console.log(err);
        res.send("Approval Failed");

    }

});


// ============================================
// Reject Payment
// ============================================

app.post("/admin/payment/reject/:id", async (req, res) => {

    try {

        await db.query(
            `UPDATE payments
             SET status='Rejected'
             WHERE id=?`,
            [req.params.id]
        );

        res.redirect("/admin/payments");

    } catch (err) {

        console.log(err);
        res.send("Reject Failed");

    }

});


// ============================================
// Verify Payment
// ============================================

app.post("/admin/payment/verify/:id", async (req, res) => {

    try {

        await db.query(
            `UPDATE payments
             SET status='Verified'
             WHERE id=?`,
            [req.params.id]
        );

        res.redirect("/admin/payments");

    } catch (err) {

        console.log(err);
        res.send("Verification Failed");

    }

});


// ============================================
// Payment Details
// ============================================

app.get("/payment/:id", async (req, res) => {

    try {

        const [[payment]] = await db.query(
            `
            SELECT
                payments.*,
                students.first_name,
                students.last_name,
                students.email
            FROM payments
            JOIN students
            ON students.id=payments.student_id
            WHERE payments.id=?
            `,
            [req.params.id]
        );

        res.render("payment_details", {
            payment
        });

    } catch (err) {

        console.log(err);
        res.send("Payment Not Found");

    }

});


// ============================================
// Payment Receipt PDF
// ============================================

app.get("/payment/receipt/:id", async (req, res) => {

    try {

        const [[payment]] = await db.query(`
            SELECT
                payments.*,
                students.first_name,
                students.last_name,
                students.email
            FROM payments
            JOIN students
            ON students.id=payments.student_id
            WHERE payments.id=?
        `, [req.params.id]);

        const doc = new PDFDocument();

        res.setHeader(
            "Content-Disposition",
            "attachment; filename=Receipt.pdf"
        );

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        doc.pipe(res);

        doc.fontSize(22).text("Rahma Pearl PG", {
            align: "center"
        });

        doc.moveDown();

        doc.fontSize(16).text("PAYMENT RECEIPT");

        doc.moveDown();

        doc.text("Receipt No : " + payment.id);
        doc.text("Student : " + payment.first_name + " " + payment.last_name);
        doc.text("Email : " + payment.email);
        doc.text("Amount : ₹" + payment.amount);
        doc.text("Status : " + payment.status);
        doc.text("Date : " + payment.created_at);

        doc.moveDown();

        doc.text("Thank you for your payment.");

        doc.end();

    } catch (err) {

        console.log(err);
        res.send("Receipt Error");

    }

});


// ============================================
// Student Rent History
// ============================================


// ============================================
// Monthly Rent Generator
// ============================================

cron.schedule("0 0 1 * *", async () => {

    try {

        const [students] = await db.query(
            "SELECT id FROM students"
        );

        for (const student of students) {

            await db.query(
                `
                INSERT INTO payments
                (
                    student_id,
                    amount,
                    status,
                    created_at
                )
                VALUES
                (
                    ?,
                    5500,
                    'Pending',
                    NOW()
                )
                `,
                [student.id]
            );

        }

        console.log("Monthly Rent Generated");

    } catch (err) {

        console.log(err);

    }

});


// ============================================
// EMI Calculator
// ============================================

app.get("/emi", (req, res) => {

    res.render("emi", {
        emi: null
    });

});

app.post("/emi", (req, res) => {

    const {
        amount,
        rate,
        months
    } = req.body;

    const r = rate / 12 / 100;

    const emi =
        (amount * r * Math.pow(1 + r, months)) /
        (Math.pow(1 + r, months) - 1);

    res.render("emi", {
        emi: Math.round(emi)
    });

});


// ============================================
// QR Payment Page
// ============================================

app.get("/qr-payment", (req, res) => {

    res.render("qr_payment");

});


// ============================================
// Admission Payment Upload
// ============================================

app.post(
    "/admission-payment",
    upload.single("screenshot"),
    async (req, res) => {

        try {

            await db.query(
                `
                INSERT INTO admission_payments
                (
                    student_email,
                    amount,
                    screenshot,
                    status
                )
                VALUES
                (
                    ?,?,
                    ?,
                    'Pending'
                )
                `,
                [
                    req.body.email,
                    req.body.amount,
                    req.file ? req.file.filename : ""
                ]
            );

            res.send("Admission Payment Submitted");

        } catch (err) {

            console.log(err);
            res.send("Upload Failed");

        }

    }

);
/* ===========================================================
   PART 2B-3A
   INCOME • EXPENSE • PROFIT REPORTS
=========================================================== */

// ============================================
// Income Dashboard
// ============================================

app.get("/admin/income", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login");
    }

    try {

        const [payments] = await db.query(`
            SELECT
                payments.*,
                students.first_name,
                students.last_name
            FROM payments
            LEFT JOIN students
            ON students.id = payments.student_id
            WHERE payments.status='Approved'
            ORDER BY payments.created_at DESC
        `);

        const [[totalIncome]] = await db.query(`
            SELECT
            SUM(amount) AS total
            FROM payments
            WHERE status='Approved'
        `);

        res.render("admin_income", {
            payments,
            totalIncome: totalIncome.total || 0
        });

    } catch (err) {

        console.log(err);
        res.send("Income Dashboard Error");

    }

});


// ============================================
// Expenses List
// ============================================

app.get("/admin/expenses", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login");
    }

    try {

        const [expenses] = await db.query(
            "SELECT * FROM expenses ORDER BY id DESC"
        );

        res.render("admin_expenses", {
            expenses
        });

    } catch (err) {

        console.log(err);
        res.send("Expense Error");

    }

});


// ============================================
// Add Expense
// ============================================

app.post("/admin/expenses/add", async (req, res) => {

    try {

        const {
            description,
            amount,
            category
        } = req.body;

        await db.query(`
            INSERT INTO expenses
            (
                description,
                amount,
                category,
                created_at
            )
            VALUES
            (
                ?,?,?,NOW()
            )
        `, [
            description,
            amount,
            category
        ]);

        res.redirect("/admin/expenses");

    } catch (err) {

        console.log(err);
        res.send("Insert Error");

    }

});


// ============================================
// Delete Expense
// ============================================

app.post("/admin/expenses/delete/:id", async (req, res) => {

    try {

        await db.query(
            "DELETE FROM expenses WHERE id=?",
            [req.params.id]
        );

        res.redirect("/admin/expenses");

    } catch (err) {

        console.log(err);
        res.send("Delete Error");

    }

});


// ============================================
// Profit Report
// ============================================

app.get("/admin/profit-report", async (req, res) => {

    try {

        const [[income]] = await db.query(`
            SELECT
            SUM(amount) AS total
            FROM payments
            WHERE status='Approved'
        `);

        const [[expense]] = await db.query(`
            SELECT
            SUM(amount) AS total
            FROM expenses
        `);

        const totalIncome = income.total || 0;
        const totalExpense = expense.total || 0;

        const profit = totalIncome - totalExpense;

        res.render("profit_report", {

            income: totalIncome,
            expense: totalExpense,
            profit

        });

    } catch (err) {

        console.log(err);
        res.send("Profit Report Error");

    }

});


// ============================================
// Monthly Income Report
// ============================================

app.get("/admin/monthly-income", async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT
                MONTH(created_at) AS monthNumber,
                MONTHNAME(created_at) AS month,
                SUM(amount) AS income
            FROM payments
            WHERE status='Approved'
            GROUP BY MONTH(created_at)
            ORDER BY MONTH(created_at)
        `);

        const months = [];
        const income = [];

        rows.forEach(row => {

            months.push(row.month);
            income.push(row.income);

        });

        res.render("monthly_income", {

            months,
            income

        });

    } catch (err) {

        console.log(err);
        res.send("Monthly Income Error");

    }

});


// ============================================
// Monthly Expense Report
// ============================================

app.get("/admin/monthly-expense", async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT
                MONTHNAME(created_at) AS month,
                SUM(amount) AS expense
            FROM expenses
            GROUP BY MONTH(created_at)
            ORDER BY MONTH(created_at)
        `);

        const months = [];
        const expenses = [];

        rows.forEach(row => {

            months.push(row.month);
            expenses.push(row.expense);

        });

        res.render("monthly_expense", {

            months,
            expenses

        });

    } catch (err) {

        console.log(err);
        res.send("Expense Report Error");

    }

});


// ============================================
// Income vs Expense
// ============================================

app.get("/admin/income-expense", async (req, res) => {

    try {

        const [[income]] = await db.query(`
            SELECT
            SUM(amount) AS total
            FROM payments
            WHERE status='Approved'
        `);

        const [[expense]] = await db.query(`
            SELECT
            SUM(amount) AS total
            FROM expenses
        `);

        res.render("income_expense", {

            income: income.total || 0,
            expense: expense.total || 0

        });

    } catch (err) {

        console.log(err);
        res.send("Dashboard Error");

    }

});


// ============================================
// Payment Summary API
// ============================================

app.get("/api/payment-summary", async (req, res) => {

    try {

        const [[approved]] = await db.query(`
            SELECT COUNT(*) total
            FROM payments
            WHERE status='Approved'
        `);

        const [[pending]] = await db.query(`
            SELECT COUNT(*) total
            FROM payments
            WHERE status='Pending'
        `);

        const [[rejected]] = await db.query(`
            SELECT COUNT(*) total
            FROM payments
            WHERE status='Rejected'
        `);

        res.json({

            approved: approved.total,
            pending: pending.total,
            rejected: rejected.total

        });

    } catch (err) {

        console.log(err);

        res.json({
            approved: 0,
            pending: 0,
            rejected: 0
        });

    }

});
/* ===========================================================
   PART 2B-3B-1A
   LIVE DASHBOARD API & STATISTICS
=========================================================== */

// ============================================
// LIVE DASHBOARD SUMMARY API
// ============================================

app.get("/admin/live-dashboard", async (req, res) => {

    if (!req.session.admin) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    try {

        const [[students]] = await db.query(
            "SELECT COUNT(*) total FROM students"
        );

        const [[rooms]] = await db.query(
            "SELECT COUNT(*) total FROM rooms"
        );

        const [[occupied]] = await db.query(
            "SELECT COUNT(*) total FROM students WHERE room_id IS NOT NULL"
        );

        const [[income]] = await db.query(`
            SELECT SUM(amount) total
            FROM payments
            WHERE status='Approved'
        `);

        const [[expense]] = await db.query(`
            SELECT SUM(amount) total
            FROM expenses
        `);

        const [[complaints]] = await db.query(`
            SELECT COUNT(*) total
            FROM complaints
            WHERE status='Pending'
        `);

        res.json({

            success: true,

            students: students.total || 0,

            rooms: rooms.total || 0,

            occupiedRooms: occupied.total || 0,

            availableRooms:
                (rooms.total || 0) - (occupied.total || 0),

            income: income.total || 0,

            expense: expense.total || 0,

            complaints: complaints.total || 0,

            profit:
                (income.total || 0) -
                (expense.total || 0)

        });

    } catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,

            message: "Dashboard Error"

        });

    }

});


// ============================================
// TOTAL STUDENTS API
// ============================================

app.get("/api/students/count", async (req, res) => {

    try {

        const [[result]] = await db.query(
            "SELECT COUNT(*) total FROM students"
        );

        res.json({

            totalStudents: result.total

        });

    } catch (err) {

        console.log(err);

        res.json({

            totalStudents: 0

        });

    }

});


// ============================================
// TOTAL ROOMS API
// ============================================

app.get("/api/rooms/count", async (req, res) => {

    try {

        const [[result]] = await db.query(
            "SELECT COUNT(*) total FROM rooms"
        );

        res.json({

            totalRooms: result.total

        });

    } catch (err) {

        console.log(err);

        res.json({

            totalRooms: 0

        });

    }

});


// ============================================
// OCCUPIED ROOMS API
// ============================================

app.get("/api/rooms/occupied", async (req, res) => {

    try {

        const [[result]] = await db.query(`
            SELECT COUNT(*) total
            FROM students
            WHERE room_id IS NOT NULL
        `);

        res.json({

            occupied: result.total

        });

    } catch (err) {

        console.log(err);

        res.json({

            occupied: 0

        });

    }

});


// ============================================
// AVAILABLE ROOMS API
// ============================================

app.get("/api/rooms/available", async (req, res) => {

    try {

        const [[rooms]] = await db.query(
            "SELECT COUNT(*) total FROM rooms"
        );

        const [[occupied]] = await db.query(`
            SELECT COUNT(*) total
            FROM students
            WHERE room_id IS NOT NULL
        `);

        res.json({

            available:
                (rooms.total || 0) -
                (occupied.total || 0)

        });

    } catch (err) {

        console.log(err);

        res.json({

            available: 0

        });

    }

});


// ============================================
// TOTAL INCOME API
// ============================================

app.get("/api/income", async (req, res) => {

    try {

        const [[income]] = await db.query(`
            SELECT SUM(amount) total
            FROM payments
            WHERE status='Approved'
        `);

        res.json({

            income: income.total || 0

        });

    } catch (err) {

        console.log(err);

        res.json({

            income: 0

        });

    }

});


// ============================================
// TOTAL EXPENSE API
// ============================================

app.get("/api/expense", async (req, res) => {

    try {

        const [[expense]] = await db.query(`
            SELECT SUM(amount) total
            FROM expenses
        `);

        res.json({

            expense: expense.total || 0

        });

    } catch (err) {

        console.log(err);

        res.json({

            expense: 0

        });

    }

});


// ============================================
// PROFIT API
// ============================================

app.get("/api/profit", async (req, res) => {

    try {

        const [[income]] = await db.query(`
            SELECT SUM(amount) total
            FROM payments
            WHERE status='Approved'
        `);

        const [[expense]] = await db.query(`
            SELECT SUM(amount) total
            FROM expenses
        `);

        res.json({

            profit:
                (income.total || 0) -
                (expense.total || 0)

        });

    } catch (err) {

        console.log(err);

        res.json({

            profit: 0

        });

    }

});
/* ==========================================================
   PART 2B-3B-1C
   PAYMENT VERIFICATION + RECEIPTS + PAYMENT STATISTICS
========================================================== */

// ==============================
// ADMIN PAYMENT LIST
// ==============================

app.get("/admin/payments", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login/admin");
    }

    try {

        const [payments] = await db.query(`
            SELECT
                payments.*,
                students.first_name,
                students.last_name,
                students.room_number
            FROM payments
            LEFT JOIN students
            ON payments.student_id = students.id
            ORDER BY payments.id DESC
        `);

        res.render("admin_payments", {
            payments
        });

    } catch (err) {
        console.log(err);
        res.send("Error loading payments");
    }

});

// ==============================
// VERIFY PAYMENT
// ==============================

app.post("/admin/payments/verify/:id", async (req, res) => {

    try {

        await db.query(
            `UPDATE payments
             SET status='Approved'
             WHERE id=?`,
            [req.params.id]
        );

        res.redirect("/admin/payments");

    } catch (err) {

        console.log(err);
        res.send("Verification Error");

    }

});

// ==============================
// REJECT PAYMENT
// ==============================

app.post("/admin/payments/reject/:id", async (req, res) => {

    try {

        await db.query(
            `UPDATE payments
             SET status='Rejected'
             WHERE id=?`,
            [req.params.id]
        );

        res.redirect("/admin/payments");

    } catch (err) {

        console.log(err);
        res.send("Rejection Error");

    }

});

// ==============================
// DELETE PAYMENT
// ==============================

app.post("/admin/payments/delete/:id", async (req, res) => {

    try {

        await db.query(
            "DELETE FROM payments WHERE id=?",
            [req.params.id]
        );

        res.redirect("/admin/payments");

    } catch (err) {

        console.log(err);
        res.send("Delete Error");

    }

});

// ==============================
// PAYMENT DETAILS
// ==============================

app.get("/admin/payments/:id", async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT
                payments.*,
                students.first_name,
                students.last_name,
                students.room_number
            FROM payments
            LEFT JOIN students
            ON payments.student_id = students.id
            WHERE payments.id=?
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.send("Payment Not Found");
        }

        res.render("payment_details", {
            payment: rows[0]
        });

    } catch (err) {

        console.log(err);
        res.send("Error");

    }

});

// ==============================
// DOWNLOAD PAYMENT RECEIPT
// ==============================

app.get("/payments/receipt/:id", async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT
                payments.*,
                students.first_name,
                students.last_name,
                students.room_number
            FROM payments
            LEFT JOIN students
            ON payments.student_id = students.id
            WHERE payments.id=?
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.send("Receipt Not Found");
        }

        const payment = rows[0];

        const doc = new PDFDocument();

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename=Receipt-${payment.id}.pdf`
        );

        doc.pipe(res);

        doc.fontSize(22)
            .text("Rahma Pearl Girls PG", {
                align: "center"
            });

        doc.moveDown();

        doc.fontSize(16)
            .text(`Receipt No : ${payment.id}`);

        doc.text(`Student : ${payment.first_name} ${payment.last_name}`);

        doc.text(`Room : ${payment.room_number}`);

        doc.text(`Amount : ₹${payment.amount}`);

        doc.text(`Status : ${payment.status}`);

        doc.text(`Date : ${payment.created_at}`);

        doc.moveDown();

        doc.text("Thank you for your payment.");

        doc.end();

    } catch (err) {

        console.log(err);
        res.send("Receipt Error");

    }

});

// ==============================
// PAYMENT SUMMARY API
// ==============================

app.get("/admin/payment-summary", async (req, res) => {

    try {

        const [[approved]] = await db.query(`
            SELECT COUNT(*) total
            FROM payments
            WHERE status='Approved'
        `);

        const [[pending]] = await db.query(`
            SELECT COUNT(*) total
            FROM payments
            WHERE status='Pending'
        `);

        const [[rejected]] = await db.query(`
            SELECT COUNT(*) total
            FROM payments
            WHERE status='Rejected'
        `);

        const [[income]] = await db.query(`
            SELECT SUM(amount) total
            FROM payments
            WHERE status='Approved'
        `);

        res.json({

            approved: approved.total,

            pending: pending.total,

            rejected: rejected.total,

            income: income.total || 0

        });

    } catch (err) {

        console.log(err);

        res.json({

            approved: 0,
            pending: 0,
            rejected: 0,
            income: 0

        });

    }

});
/* ==========================================================
   PART 2B-3B-1C
   PAYMENT VERIFICATION + RECEIPTS + PAYMENT STATISTICS
========================================================== */

// ==============================
// ADMIN PAYMENT LIST
// ==============================

app.get("/admin/payments", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login/admin");
    }

    try {

        const [payments] = await db.query(`
            SELECT
                payments.*,
                students.first_name,
                students.last_name,
                students.room_number
            FROM payments
            LEFT JOIN students
            ON payments.student_id = students.id
            ORDER BY payments.id DESC
        `);

        res.render("admin_payments", {
            payments
        });

    } catch (err) {
        console.log(err);
        res.send("Error loading payments");
    }

});

// ==============================
// VERIFY PAYMENT
// ==============================

app.post("/admin/payments/verify/:id", async (req, res) => {

    try {

        await db.query(
            `UPDATE payments
             SET status='Approved'
             WHERE id=?`,
            [req.params.id]
        );

        res.redirect("/admin/payments");

    } catch (err) {

        console.log(err);
        res.send("Verification Error");

    }

});

// ==============================
// REJECT PAYMENT
// ==============================

app.post("/admin/payments/reject/:id", async (req, res) => {

    try {

        await db.query(
            `UPDATE payments
             SET status='Rejected'
             WHERE id=?`,
            [req.params.id]
        );

        res.redirect("/admin/payments");

    } catch (err) {

        console.log(err);
        res.send("Rejection Error");

    }

});

// ==============================
// DELETE PAYMENT
// ==============================

app.post("/admin/payments/delete/:id", async (req, res) => {

    try {

        await db.query(
            "DELETE FROM payments WHERE id=?",
            [req.params.id]
        );

        res.redirect("/admin/payments");

    } catch (err) {

        console.log(err);
        res.send("Delete Error");

    }

});

// ==============================
// PAYMENT DETAILS
// ==============================

app.get("/admin/payments/:id", async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT
                payments.*,
                students.first_name,
                students.last_name,
                students.room_number
            FROM payments
            LEFT JOIN students
            ON payments.student_id = students.id
            WHERE payments.id=?
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.send("Payment Not Found");
        }

        res.render("payment_details", {
            payment: rows[0]
        });

    } catch (err) {

        console.log(err);
        res.send("Error");

    }

});

// ==============================
// DOWNLOAD PAYMENT RECEIPT
// ==============================

app.get("/payments/receipt/:id", async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT
                payments.*,
                students.first_name,
                students.last_name,
                students.room_number
            FROM payments
            LEFT JOIN students
            ON payments.student_id = students.id
            WHERE payments.id=?
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.send("Receipt Not Found");
        }

        const payment = rows[0];

        const doc = new PDFDocument();

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename=Receipt-${payment.id}.pdf`
        );

        doc.pipe(res);

        doc.fontSize(22)
            .text("Rahma Pearl Girls PG", {
                align: "center"
            });

        doc.moveDown();

        doc.fontSize(16)
            .text(`Receipt No : ${payment.id}`);

        doc.text(`Student : ${payment.first_name} ${payment.last_name}`);

        doc.text(`Room : ${payment.room_number}`);

        doc.text(`Amount : ₹${payment.amount}`);

        doc.text(`Status : ${payment.status}`);

        doc.text(`Date : ${payment.created_at}`);

        doc.moveDown();

        doc.text("Thank you for your payment.");

        doc.end();

    } catch (err) {

        console.log(err);
        res.send("Receipt Error");

    }

});

// ==============================
// PAYMENT SUMMARY API
// ==============================

app.get("/admin/payment-summary", async (req, res) => {

    try {

        const [[approved]] = await db.query(`
            SELECT COUNT(*) total
            FROM payments
            WHERE status='Approved'
        `);

        const [[pending]] = await db.query(`
            SELECT COUNT(*) total
            FROM payments
            WHERE status='Pending'
        `);

        const [[rejected]] = await db.query(`
            SELECT COUNT(*) total
            FROM payments
            WHERE status='Rejected'
        `);

        const [[income]] = await db.query(`
            SELECT SUM(amount) total
            FROM payments
            WHERE status='Approved'
        `);

        res.json({

            approved: approved.total,

            pending: pending.total,

            rejected: rejected.total,

            income: income.total || 0

        });

    } catch (err) {

        console.log(err);

        res.json({

            approved: 0,
            pending: 0,
            rejected: 0,
            income: 0

        });

    }

});
/* ==========================================================
   PART 2B-3B-1D
   ROOM BOOKING + ROOM TRANSFER + VACANCY MANAGEMENT
========================================================== */

// =====================================
// STUDENT BOOK ROOM REQUEST
// =====================================

app.post("/student/book-room", async (req, res) => {

    if (!req.session.student) {
        return res.redirect("/login/student");
    }

    try {

        const student = req.session.student;

        const { room_id } = req.body;

        const [already] = await db.query(
            "SELECT * FROM room_bookings WHERE student_id=? AND status='Pending'",
            [student.id]
        );

        if (already.length > 0) {
            return res.send("You already have a pending request.");
        }

        await db.query(
            `INSERT INTO room_bookings
            (student_id, room_id, status)
            VALUES (?,?,?)`,
            [
                student.id,
                room_id,
                "Pending"
            ]
        );

        res.redirect("/student/dashboard");

    } catch (err) {

        console.log(err);
        res.send("Booking Error");

    }

});


// =====================================
// ADMIN VIEW BOOKING REQUESTS
// =====================================

app.get("/admin/room-bookings", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login/admin");
    }

    try {

        const [bookings] = await db.query(`

            SELECT
                room_bookings.id,
                room_bookings.status,
                students.first_name,
                students.last_name,
                students.email,
                rooms.room_number

            FROM room_bookings

            JOIN students
            ON room_bookings.student_id = students.id

            JOIN rooms
            ON room_bookings.room_id = rooms.id

            ORDER BY room_bookings.id DESC

        `);

        res.render("room_bookings", {
            bookings
        });

    } catch (err) {

        console.log(err);
        res.send("Database Error");

    }

});


// =====================================
// APPROVE ROOM BOOKING
// =====================================

app.post("/admin/room-bookings/approve/:id", async (req, res) => {

    try {

        const [booking] = await db.query(
            "SELECT * FROM room_bookings WHERE id=?",
            [req.params.id]
        );

        if (booking.length === 0) {
            return res.send("Booking Not Found");
        }

        const request = booking[0];

        const [room] = await db.query(
            "SELECT * FROM rooms WHERE id=?",
            [request.room_id]
        );

        if (room.length === 0) {
            return res.send("Room Not Found");
        }

        if (room[0].occupied >= room[0].capacity) {
            return res.send("Room Full");
        }

        await db.query(
            "UPDATE students SET room_id=?, room_number=? WHERE id=?",
            [
                room[0].id,
                room[0].room_number,
                request.student_id
            ]
        );

        await db.query(
            "UPDATE rooms SET occupied=occupied+1 WHERE id=?",
            [room[0].id]
        );

        await db.query(
            "UPDATE room_bookings SET status='Approved' WHERE id=?",
            [request.id]
        );

        res.redirect("/admin/room-bookings");

    } catch (err) {

        console.log(err);
        res.send("Approval Error");

    }

});


// =====================================
// REJECT BOOKING
// =====================================

app.post("/admin/room-bookings/reject/:id", async (req, res) => {

    try {

        await db.query(
            "UPDATE room_bookings SET status='Rejected' WHERE id=?",
            [req.params.id]
        );

        res.redirect("/admin/room-bookings");

    } catch (err) {

        console.log(err);
        res.send("Reject Error");

    }

});


// =====================================
// AVAILABLE ROOMS API
// =====================================

app.get("/available-rooms", async (req, res) => {

    try {

        const [rooms] = await db.query(`
            SELECT *
            FROM rooms
            WHERE occupied < capacity
            ORDER BY room_number
        `);

        res.json(rooms);

    } catch (err) {

        console.log(err);
        res.json([]);

    }

});


// =====================================
// TRANSFER STUDENT ROOM
// =====================================

app.post("/admin/transfer-room", async (req, res) => {

    try {

        const {

            student_id,

            old_room,

            new_room

        } = req.body;

        await db.query(
            "UPDATE rooms SET occupied=occupied-1 WHERE id=?",
            [old_room]
        );

        await db.query(
            "UPDATE rooms SET occupied=occupied+1 WHERE id=?",
            [new_room]
        );

        const [room] = await db.query(
            "SELECT room_number FROM rooms WHERE id=?",
            [new_room]
        );

        await db.query(
            `UPDATE students
             SET room_id=?,
                 room_number=?
             WHERE id=?`,
            [
                new_room,
                room[0].room_number,
                student_id
            ]
        );

        res.redirect("/admin/students");

    } catch (err) {

        console.log(err);
        res.send("Transfer Error");

    }

});


// =====================================
// ROOM VACANCY REPORT
// =====================================

app.get("/admin/vacancy-report", async (req, res) => {

    try {

        const [rooms] = await db.query(`

            SELECT

                room_number,

                capacity,

                occupied,

                (capacity - occupied) AS vacant

            FROM rooms

            ORDER BY room_number

        `);

        res.render("vacancy_report", {

            rooms

        });

    } catch (err) {

        console.log(err);

        res.send("Error");

    }

});


// =====================================
// STUDENT ROOM HISTORY
// =====================================

app.get("/admin/student-room-history/:id", async (req, res) => {

    try {

        const [history] = await db.query(

            `SELECT *
             FROM room_history
             WHERE student_id=?
             ORDER BY changed_at DESC`,

            [req.params.id]

        );

        res.render("room_history", {

            history

        });

    } catch (err) {

        console.log(err);

        res.send("Error");

    }

});
/* ==========================================================
   PART 2B-3B-2A
   COMPLETE COMPLAINT MANAGEMENT SYSTEM
========================================================== */

// =====================================
// STUDENT COMPLAINT PAGE
// =====================================

app.get("/student/complaints", isStudent, async (req, res) => {
    const [complaints] = await db.query(
        "SELECT * FROM complaints WHERE student_email=? ORDER BY id DESC",
        [req.session.student.email]
    );

    res.render("student_complaints", {
        complaints
    });
});
app.post("/student/complaint", isStudent, async (req, res) => {
    await db.query(
        "INSERT INTO complaints (student_email, complaint, status) VALUES (?, ?, 'Pending')",
        [req.session.student.email, req.body.complaint]
    );

    res.redirect("/student/complaints");
});
// =====================================
// ADD COMPLAINT
// =====================================

app.post("/student/complaints/add", async (req, res) => {

    if (!req.session.student) {
        return res.redirect("/login/student");
    }

    try {

        const student = req.session.student;

        const {
            title,
            description,
            category,
            priority
        } = req.body;

        await db.query(

            `INSERT INTO complaints
            (
                student_id,
                student_name,
                student_email,
                title,
                description,
                category,
                priority,
                status,
                created_at
            )

            VALUES (?,?,?,?,?,?,?,?,NOW())`,

            [
                student.id,
                student.first_name,
                student.email,
                title,
                description,
                category,
                priority,
                "Pending"
            ]

        );

        res.redirect("/student/complaints");

    } catch (err) {

        console.log(err);
        res.send("Complaint Error");

    }

});

// =====================================
// ADMIN COMPLAINT LIST
// =====================================

app.get("/admin/complaints", isAdmin, async (req, res) => {
    try {
        const [complaints] = await db.query(`
            SELECT
                complaints.*,
                students.first_name,
                students.last_name,
                students.room_number
            FROM complaints
            LEFT JOIN students
            ON complaints.student_email = students.email
            ORDER BY complaints.id DESC
        `);

        res.render("admin_complaints", {
            complaints
        });

    } catch (err) {
        console.error("ADMIN COMPLAINTS ERROR:", err);
        res.status(500).send(err.message);
    }
});

// =====================================
// VIEW SINGLE COMPLAINT
// =====================================

app.get("/admin/complaints/:id", async (req, res) => {

    try {

        const [rows] = await db.query(

            "SELECT * FROM complaints WHERE id=?",

            [req.params.id]

        );

        if (rows.length === 0) {
            return res.send("Complaint Not Found");
        }

        res.render("complaint_details", {

            complaint: rows[0]

        });

    } catch (err) {

        console.log(err);

        res.send("Error");

    }

});

// =====================================
// UPDATE STATUS
// =====================================

app.get("/admin/complaint-status/:id/:status", isAdmin, async (req, res) => {
    try {
        await db.query(
            "UPDATE complaints SET status=? WHERE id=?",
            [req.params.status, req.params.id]
        );

        res.redirect("/admin/complaints");

    } catch (err) {
        console.error("COMPLAINT STATUS ERROR:", err);
        res.status(500).send(err.message);
    }
});

app.get("/login/admin", (req, res) => {
    res.redirect("/login");
});

// =====================================
// ADMIN REPLY
// =====================================

app.post("/admin/complaints/reply/:id", async (req, res) => {

    try {

        const { reply } = req.body;

        await db.query(

            `UPDATE complaints
             SET admin_reply=?,
                 status='Resolved',
                 resolved_at=NOW()
             WHERE id=?`,

            [
                reply,
                req.params.id
            ]

        );

        res.redirect("/admin/complaints");

    } catch (err) {

        console.log(err);

        res.send("Reply Error");

    }

});

// =====================================
// DELETE COMPLAINT
// =====================================

app.post("/admin/complaints/delete/:id", async (req, res) => {
    try {

        await db.query(
            "DELETE FROM complaints WHERE id=?",
            [req.params.id]
        );

        res.redirect("/admin/complaints");

    } catch (err) {
        console.log(err);
        res.send("Delete Failed");
    }
});

// =====================================
// COMPLAINT DASHBOARD API
// =====================================

app.get("/admin/complaints-summary", async (req, res) => {

    try {

        const [[pending]] = await db.query(
            "SELECT COUNT(*) total FROM complaints WHERE status='Pending'"
        );

        const [[progress]] = await db.query(
            "SELECT COUNT(*) total FROM complaints WHERE status='In Progress'"
        );

        const [[resolved]] = await db.query(
            "SELECT COUNT(*) total FROM complaints WHERE status='Resolved'"
        );

        const [[total]] = await db.query(
            "SELECT COUNT(*) total FROM complaints"
        );

        res.json({

            total: total.total,

            pending: pending.total,

            progress: progress.total,

            resolved: resolved.total

        });

    } catch (err) {

        console.log(err);

        res.json({

            total: 0,

            pending: 0,

            progress: 0,

            resolved: 0

        });

    }

});

// =====================================
// STUDENT COMPLAINT HISTORY
// =====================================

app.get("/student/complaints/history", async (req, res) => {

    if (!req.session.student) {
        return res.redirect("/login/student");
    }

    try {

        const [history] = await db.query(

            `SELECT
                title,
                category,
                priority,
                status,
                admin_reply,
                created_at,
                resolved_at
             FROM complaints
             WHERE student_id=?
             ORDER BY created_at DESC`,

            [req.session.student.id]

        );

        res.render("complaint_history", {

            history

        });

    } catch (err) {

        console.log(err);

        res.send("Database Error");

    }

});
/* ==========================================================
   PART 2B-3B-2B
   VISITOR MANAGEMENT SYSTEM
========================================================== */

// =====================================
// ADMIN VISITOR LIST
// =====================================

app.post("/admin/visitors/add", isAdmin, async (req, res) => {
    try {

        const {
            visitor_name,
            phone,
            student_name,
            room_number
        } = req.body;

        await db.query(
            `INSERT INTO visitors
            (visitor_name, phone, student_name, room_number, entry_time)
            VALUES (?, ?, ?, ?, NOW())`,
            [
                visitor_name,
                phone,
                student_name,
                room_number
            ]
        );

        res.redirect("/admin/visitors");

    } catch (err) {

        console.log(err);

        return res.render("error-message",{

        title:"Visitor Registration Failed",

         heading:"Visitor Already Registered",

         message:"A visitor with this information already exists."

        });

    }
});

app.get("/admin/visitors", isAdmin, async (req, res) => {
    try {

        const [visitors] = await db.query(
            "SELECT * FROM visitors ORDER BY id DESC"
        );

        res.render("admin_visitors", {
            visitors
        });

    } catch (err) {

        console.log(err);

        res.send("Database Error");

    }
});

// =====================================
// STUDENT ADD VISITOR REQUEST
// =====================================

app.post("/student/visitor/add", isStudent, async (req, res) => {
    try {
        const { visitor_name, phone, entry_time, exit_time } = req.body;

        await db.query(
            `INSERT INTO visitors
             (visitor_name, phone, student_name, room_number, entry_time, exit_time)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                visitor_name,
                phone,
                req.session.student.first_name,
                req.session.student.room_number,
                entry_time,
                exit_time || null
            ]
        );

        res.redirect("/student/dashboard");

    } catch (err) {
        console.error("STUDENT VISITOR ERROR:", err);
        res.status(500).send(err.message);
    }
});

// =====================================
// APPROVE VISITOR
// =====================================

app.post("/admin/visitors/approve/:id", async (req, res) => {

    try {

        await db.query(

            `UPDATE visitors
             SET status='Approved'
             WHERE id=?`,

            [req.params.id]

        );

        res.redirect("/admin/visitors");

    } catch (err) {

        console.log(err);
        res.send("Approval Error");

    }

});


app.get("/admin/visitors/edit/:id", isAdmin, async (req, res) => {
    const [[visitor]] = await db.query(
        "SELECT * FROM visitors WHERE id=?",
        [req.params.id]
    );

    res.render("edit_visitor", { visitor });
});

app.post("/admin/visitors/update/:id", isAdmin, async (req, res) => {
    const { visitor_name, phone, student_name, room_number, entry_time, exit_time } = req.body;

    await db.query(
        `UPDATE visitors
         SET visitor_name=?, phone=?, student_name=?, room_number=?, entry_time=?, exit_time=?
         WHERE id=?`,
        [visitor_name, phone, student_name, room_number, entry_time, exit_time || null, req.params.id]
    );

    res.redirect("/admin/visitors");
});

app.post("/admin/visitors/delete/:id", isAdmin, async (req, res) => {
    await db.query("DELETE FROM visitors WHERE id=?", [req.params.id]);
    res.redirect("/admin/visitors");
});

// =====================================
// REJECT VISITOR
// =====================================

app.post("/admin/visitors/reject/:id", async (req, res) => {

    try {

        await db.query(

            `UPDATE visitors
             SET status='Rejected'
             WHERE id=?`,

            [req.params.id]

        );

        res.redirect("/admin/visitors");

    } catch (err) {

        console.log(err);
        res.send("Reject Error");

    }

});

// =====================================
// CHECK-IN VISITOR
// =====================================

app.post("/admin/visitors/checkin/:id", async (req, res) => {

    try {

        await db.query(

            `UPDATE visitors
             SET check_in=NOW()
             WHERE id=?`,

            [req.params.id]

        );

        res.redirect("/admin/visitors");

    } catch (err) {

        console.log(err);
        res.send("Check-In Error");

    }

});

// =====================================
// CHECK-OUT VISITOR
// =====================================

app.post("/admin/visitors/checkout/:id", async (req, res) => {

    try {

        await db.query(

            `UPDATE visitors
             SET check_out=NOW()
             WHERE id=?`,

            [req.params.id]

        );

        res.redirect("/admin/visitors");

    } catch (err) {

        console.log(err);
        res.send("Check-Out Error");

    }

});

// =====================================
// DELETE VISITOR
// =====================================

app.post("/admin/visitors/delete/:id", async (req, res) => {

    try {

        await db.query(

            "DELETE FROM visitors WHERE id=?",

            [req.params.id]

        );

        res.redirect("/admin/visitors");

    } catch (err) {

        console.log(err);
        res.send("Delete Error");

    }

});

// =====================================
// STUDENT VISITOR HISTORY
// =====================================

app.get("/student/visitors", async (req, res) => {

    if (!req.session.student) {
        return res.redirect("/login/student");
    }

    try {

        const [visitors] = await db.query(

            `SELECT *
             FROM visitors
             WHERE student_id=?
             ORDER BY id DESC`,

            [req.session.student.id]

        );

        res.render("student_visitors", {

            visitors

        });

    } catch (err) {

        console.log(err);

        res.send("Database Error");

    }

});

// =====================================
// VISITOR SUMMARY API
// =====================================

app.get("/admin/visitor-summary", async (req, res) => {

    try {

        const [[total]] = await db.query(
            "SELECT COUNT(*) total FROM visitors"
        );

        const [[pending]] = await db.query(
            "SELECT COUNT(*) total FROM visitors WHERE status='Pending'"
        );

        const [[approved]] = await db.query(
            "SELECT COUNT(*) total FROM visitors WHERE status='Approved'"
        );

        const [[today]] = await db.query(
            "SELECT COUNT(*) total FROM visitors WHERE DATE(visit_date)=CURDATE()"
        );

        res.json({

            total: total.total,

            pending: pending.total,

            approved: approved.total,

            today: today.total

        });

    } catch (err) {

        console.log(err);

        res.json({

            total: 0,

            pending: 0,

            approved: 0,

            today: 0

        });

    }

});

// =====================================
// TODAY'S VISITORS
// =====================================

app.get("/admin/today-visitors", async (req, res) => {

    try {

        const [visitors] = await db.query(

            `SELECT *
             FROM visitors
             WHERE DATE(visit_date)=CURDATE()
             ORDER BY visit_date ASC`

        );

        res.render("today_visitors", {

            visitors

        });

    } catch (err) {

        console.log(err);

        res.send("Database Error");

    }

});
/* ==========================================================
   PART 2B-3B-2C
   FOOD MENU MANAGEMENT SYSTEM
========================================================== */

// =====================================
// ADMIN FOOD MENU PAGE
// =====================================

app.get("/admin/food-menu", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login/admin");
    }

    try {

        const [menu] = await db.query(`
            SELECT *
            FROM food_menu
            ORDER BY id ASC
        `);

        res.render("admin_food_menu", {
            menu
        });

    } catch (err) {

        console.log(err);
        res.send("Database Error");

    }

});

// =====================================
// STUDENT MENU PAGE
// =====================================

app.get("/student/menu", isStudent, async (req, res) => {
    try {
        const [menu] = await db.query(
            "SELECT * FROM food_menu ORDER BY id"
        );

        res.render("food_menu", {
            menu: menu || []
        });

    } catch (err) {
        console.error("STUDENT MENU ERROR:", err);
        res.status(500).send(err.message);
    }
});

// =====================================
// ADD MENU
// =====================================

app.post("/admin/food-menu/add", async (req, res) => {

    try {

        const {
            day,
            breakfast,
            lunch,
            snacks,
            dinner
        } = req.body;

        await db.query(

            `INSERT INTO food_menu
            (
                day,
                breakfast,
                lunch,
                snacks,
                dinner
            )

            VALUES (?,?,?,?,?)`,

            [
                day,
                breakfast,
                lunch,
                snacks,
                dinner
            ]

        );

        res.redirect("/admin/food-menu");

    } catch (err) {

        console.log(err);
        res.send("Insert Error");

    }

});

// =====================================
// EDIT MENU PAGE
// =====================================

app.get("/admin/food-menu/edit/:id", async (req, res) => {

    try {

        const [rows] = await db.query(
            "SELECT * FROM food_menu WHERE id=?",
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.send("Menu Not Found");
        }

        res.render("edit_food_menu", {
            menu: rows[0]
        });

    } catch (err) {

        console.log(err);
        res.send("Database Error");

    }

});

// =====================================
// UPDATE MENU
// =====================================

app.post("/admin/food-menu/update/:id", async (req, res) => {

    try {

        const {

            day,
            breakfast,
            lunch,
            snacks,
            dinner

        } = req.body;

        await db.query(

            `UPDATE food_menu
             SET
             day=?,
             breakfast=?,
             lunch=?,
             snacks=?,
             dinner=?
             WHERE id=?`,

            [
                day,
                breakfast,
                lunch,
                snacks,
                dinner,
                req.params.id
            ]

        );

        res.redirect("/admin/food-menu");

    } catch (err) {

        console.log(err);
        res.send("Update Error");

    }

});

// =====================================
// DELETE MENU
// =====================================

app.post("/admin/food-menu/delete/:id", async (req, res) => {

    try {

        await db.query(
            "DELETE FROM food_menu WHERE id=?",
            [req.params.id]
        );

        res.redirect("/admin/food-menu");

    } catch (err) {

        console.log(err);
        res.send("Delete Error");

    }

});

// =====================================
// TODAY'S MENU API
// =====================================

app.get("/today-menu", async (req, res) => {

    try {

        const days = [

            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday"

        ];

        const today = days[new Date().getDay()];

        const [rows] = await db.query(

            "SELECT * FROM food_menu WHERE day=?",

            [today]

        );

        res.json(rows[0] || {});

    } catch (err) {

        console.log(err);

        res.json({});

    }

});

// =====================================
// GENERATE DEFAULT WEEKLY MENU
// =====================================

app.get("/admin/generate-menu", async (req, res) => {

    try {

        await db.query("DELETE FROM food_menu");

        const weeklyMenu = [

            ["Monday","Idli","Rice & Sambar","Tea","Chapati & Curry"],
            ["Tuesday","Dosa","Rice & Dal","Coffee","Veg Biryani"],
            ["Wednesday","Upma","Curd Rice","Tea","Fried Rice"],
            ["Thursday","Poori","Meals","Coffee","Chapati & Paneer"],
            ["Friday","Pongal","Rice & Curry","Tea","Veg Pulao"],
            ["Saturday","Paratha","Dal Rice","Coffee","Noodles"],
            ["Sunday","Masala Dosa","Chicken Biryani","Juice","Special Dinner"]

        ];

        for (const item of weeklyMenu) {

            await db.query(

                `INSERT INTO food_menu
                (
                    day,
                    breakfast,
                    lunch,
                    snacks,
                    dinner
                )

                VALUES (?,?,?,?,?)`,

                item

            );

        }

        res.redirect("/admin/food-menu");

    } catch (err) {

        console.log(err);
        res.send("Generation Error");

    }

});

// =====================================
// SPECIAL MENU
// =====================================

app.post("/admin/special-menu", async (req, res) => {

    try {

        const {

            date,
            breakfast,
            lunch,
            snacks,
            dinner

        } = req.body;

        await db.query(

            `INSERT INTO special_menu
            (
                menu_date,
                breakfast,
                lunch,
                snacks,
                dinner
            )

            VALUES (?,?,?,?,?)`,

            [
                date,
                breakfast,
                lunch,
                snacks,
                dinner
            ]

        );

        res.redirect("/admin/food-menu");

    } catch (err) {

        console.log(err);

        res.send("Error");

    }

});

// =====================================
// SPECIAL MENU API
// =====================================

app.get("/special-menu", async (req, res) => {

    try {

        const [rows] = await db.query(

            `SELECT *
             FROM special_menu
             WHERE menu_date = CURDATE()`

        );

        res.json(rows);

    } catch (err) {

        console.log(err);

        res.json([]);

    }

});

// =====================================
// FOOD MENU STATISTICS
// =====================================

app.get("/admin/menu-summary", async (req, res) => {

    try {

        const [[days]] = await db.query(
            "SELECT COUNT(*) total FROM food_menu"
        );

        const [[special]] = await db.query(
            "SELECT COUNT(*) total FROM special_menu"
        );

        res.json({

            weeklyMenu: days.total,

            specialMenus: special.total

        });

    } catch (err) {

        console.log(err);

        res.json({

            weeklyMenu: 0,

            specialMenus: 0

        });

    }

});
/* ==========================================================
   PART 2B-3B-2D
   EXPENSE MANAGEMENT SYSTEM
========================================================== */

// =====================================
// ADMIN EXPENSE LIST
// =====================================

app.get("/expenses", isAdmin, (req, res) => {
    res.redirect("/admin/expenses");
});

app.get("/admin/expenses", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login/admin");
    }

    try {

        const [expenses] = await db.query(`
            SELECT *
            FROM expenses
            ORDER BY expense_date DESC, id DESC
        `);

        res.render("admin_expenses", {
            expenses
        });

    } catch (err) {

        console.log(err);
        res.send("Database Error");

    }

});

// =====================================
// ADD EXPENSE
// =====================================

app.post("/admin/expenses/add", async (req, res) => {

    try {

        const {
            category,
            description,
            amount,
            expense_date
        } = req.body;

        await db.query(
            `INSERT INTO expenses
            (
                category,
                description,
                amount,
                expense_date
            )
            VALUES (?,?,?,?)`,
            [
                category,
                description,
                amount,
                expense_date
            ]
        );

        res.redirect("/admin/expenses");

    } catch (err) {

        console.log(err);
        res.send("Insert Error");

    }

});

// =====================================
// EDIT EXPENSE PAGE
// =====================================

app.get("/admin/expenses/edit/:id", async (req, res) => {

    try {

        const [rows] = await db.query(
            "SELECT * FROM expenses WHERE id=?",
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.send("Expense Not Found");
        }

        res.render("edit_expense", {
            expense: rows[0]
        });

    } catch (err) {

        console.log(err);
        res.send("Database Error");

    }

});

// =====================================
// UPDATE EXPENSE
// =====================================

app.post("/admin/expenses/update/:id", async (req, res) => {

    try {

        const {
            category,
            description,
            amount,
            expense_date
        } = req.body;

        await db.query(
            `UPDATE expenses
             SET
             category=?,
             description=?,
             amount=?,
             expense_date=?
             WHERE id=?`,
            [
                category,
                description,
                amount,
                expense_date,
                req.params.id
            ]
        );

        res.redirect("/admin/expenses");

    } catch (err) {

        console.log(err);
        res.send("Update Error");

    }

});

// =====================================
// DELETE EXPENSE
// =====================================

app.post("/admin/expenses/delete/:id", async (req, res) => {

    try {

        await db.query(
            "DELETE FROM expenses WHERE id=?",
            [req.params.id]
        );

        res.redirect("/admin/expenses");

    } catch (err) {

        console.log(err);
        res.send("Delete Error");

    }

});

// =====================================
// MONTHLY EXPENSE REPORT
// =====================================

app.get("/admin/monthly-expenses", async (req, res) => {

    try {

        const [report] = await db.query(`
            SELECT
                MONTHNAME(expense_date) AS month,
                SUM(amount) AS total
            FROM expenses
            GROUP BY MONTH(expense_date)
            ORDER BY MONTH(expense_date)
        `);

        res.render("monthly_expense_report", {
            report
        });

    } catch (err) {

        console.log(err);
        res.send("Report Error");

    }

});

// =====================================
// CATEGORY REPORT
// =====================================

app.get("/admin/expense-category-report", async (req, res) => {

    try {

        const [categories] = await db.query(`
            SELECT
                category,
                SUM(amount) AS total
            FROM expenses
            GROUP BY category
            ORDER BY total DESC
        `);

        res.render("expense_category_report", {
            categories
        });

    } catch (err) {

        console.log(err);
        res.send("Database Error");

    }

});

// =====================================
// PROFIT & LOSS REPORT
// =====================================

app.get("/admin/profit-loss", async (req, res) => {

    try {

        const [[income]] = await db.query(`
            SELECT
                SUM(amount) total
            FROM payments
            WHERE status='Approved'
        `);

        const [[expense]] = await db.query(`
            SELECT
                SUM(amount) total
            FROM expenses
        `);

        const totalIncome = income.total || 0;
        const totalExpense = expense.total || 0;

        res.render("profit_loss", {

            income: totalIncome,

            expense: totalExpense,

            profit: totalIncome - totalExpense

        });

    } catch (err) {

        console.log(err);
        res.send("Calculation Error");

    }

});

// =====================================
// EXPENSE SUMMARY API
// =====================================

app.get("/admin/expense-summary", async (req, res) => {

    try {

        const [[total]] = await db.query(
            "SELECT SUM(amount) total FROM expenses"
        );

        const [[today]] = await db.query(
            `SELECT SUM(amount) total
             FROM expenses
             WHERE DATE(expense_date)=CURDATE()`
        );

        const [[month]] = await db.query(
            `SELECT SUM(amount) total
             FROM expenses
             WHERE MONTH(expense_date)=MONTH(CURDATE())
             AND YEAR(expense_date)=YEAR(CURDATE())`
        );

        const [category] = await db.query(`
            SELECT
                category,
                SUM(amount) total
            FROM expenses
            GROUP BY category
            ORDER BY total DESC
            LIMIT 5
        `);

        res.json({

            totalExpense: total.total || 0,

            todayExpense: today.total || 0,

            monthlyExpense: month.total || 0,

            categories: category

        });

    } catch (err) {

        console.log(err);

        res.json({

            totalExpense: 0,

            todayExpense: 0,

            monthlyExpense: 0,

            categories: []

        });

    }

});

// =====================================
// RECENT EXPENSES API
// =====================================

app.get("/admin/recent-expenses", async (req, res) => {

    try {

        const [expenses] = await db.query(`
            SELECT *
            FROM expenses
            ORDER BY id DESC
            LIMIT 10
        `);

        res.json(expenses);

    } catch (err) {

        console.log(err);

        res.json([]);

    }

});
/* ==========================================================
   PART 2C-1A
   ADVANCED REPORTS & ANALYTICS
   INCOME REPORTS
========================================================== */

// =====================================
// ADMIN INCOME REPORT PAGE
// =====================================

app.get("/admin/income-report", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login/admin");
    }

    try {

        const [payments] = await db.query(`
            SELECT
                payments.*,
                students.first_name,
                students.last_name
            FROM payments
            LEFT JOIN students
            ON payments.student_id = students.id
            WHERE payments.status='Approved'
            ORDER BY payments.id DESC
        `);

        res.render("income_report", {
            payments
        });

    } catch (err) {

        console.log(err);
        res.send("Database Error");

    }

});

// =====================================
// MONTHLY INCOME REPORT
// =====================================

app.get("/admin/monthly-income", async (req, res) => {

    try {

        const [income] = await db.query(`

            SELECT

                MONTHNAME(created_at) AS month,

                MONTH(created_at) AS month_no,

                SUM(amount) AS total

            FROM payments

            WHERE status='Approved'

            GROUP BY MONTH(created_at)

            ORDER BY MONTH(created_at)

        `);

        res.render("monthly_income", {

            income

        });

    } catch (err) {

        console.log(err);

        res.send("Database Error");

    }

});

// =====================================
// YEARLY INCOME REPORT
// =====================================

app.get("/admin/yearly-income", async (req, res) => {

    try {

        const [income] = await db.query(`

            SELECT

                YEAR(created_at) AS year,

                SUM(amount) AS total

            FROM payments

            WHERE status='Approved'

            GROUP BY YEAR(created_at)

            ORDER BY YEAR(created_at)

        `);

        res.render("yearly_income", {

            income

        });

    } catch (err) {

        console.log(err);

        res.send("Database Error");

    }

});

// =====================================
// TODAY COLLECTION
// =====================================

app.get("/admin/today-income", async (req, res) => {

    try {

        const [[today]] = await db.query(`

            SELECT

                SUM(amount) total

            FROM payments

            WHERE status='Approved'

            AND DATE(created_at)=CURDATE()

        `);

        res.json({

            total: today.total || 0

        });

    } catch (err) {

        console.log(err);

        res.json({

            total: 0

        });

    }

});

// =====================================
// MONTH COLLECTION
// =====================================

app.get("/admin/current-month-income", async (req, res) => {

    try {

        const [[month]] = await db.query(`

            SELECT

                SUM(amount) total

            FROM payments

            WHERE status='Approved'

            AND MONTH(created_at)=MONTH(CURDATE())

            AND YEAR(created_at)=YEAR(CURDATE())

        `);

        res.json({

            total: month.total || 0

        });

    } catch (err) {

        console.log(err);

        res.json({

            total: 0

        });

    }

});

// =====================================
// TOTAL COLLECTION
// =====================================

app.get("/admin/total-income", async (req, res) => {

    try {

        const [[income]] = await db.query(`

            SELECT

                SUM(amount) total

            FROM payments

            WHERE status='Approved'

        `);

        res.json({

            total: income.total || 0

        });

    } catch (err) {

        console.log(err);

        res.json({

            total: 0

        });

    }

});

// =====================================
// LAST 10 PAYMENTS
// =====================================

app.get("/admin/recent-payments", async (req, res) => {

    try {

        const [payments] = await db.query(`

            SELECT

                payments.id,

                students.first_name,

                students.last_name,

                payments.amount,

                payments.status,

                payments.created_at

            FROM payments

            LEFT JOIN students

            ON students.id = payments.student_id

            ORDER BY payments.id DESC

            LIMIT 10

        `);

        res.json(payments);

    } catch (err) {

        console.log(err);

        res.json([]);

    }

});

// =====================================
// PAYMENT STATUS REPORT
// =====================================

app.get("/admin/payment-status", async (req, res) => {

    try {

        const [[approved]] = await db.query(

            "SELECT COUNT(*) total FROM payments WHERE status='Approved'"

        );

        const [[pending]] = await db.query(

            "SELECT COUNT(*) total FROM payments WHERE status='Pending'"

        );

        const [[rejected]] = await db.query(

            "SELECT COUNT(*) total FROM payments WHERE status='Rejected'"

        );

        res.json({

            approved: approved.total,

            pending: pending.total,

            rejected: rejected.total

        });

    } catch (err) {

        console.log(err);

        res.json({

            approved: 0,

            pending: 0,

            rejected: 0

        });

    }

});
/* ==========================================================
   PART 2C-1B
   OCCUPANCY ANALYTICS + DASHBOARD STATISTICS
========================================================== */

// =====================================
// ROOM OCCUPANCY REPORT PAGE
// =====================================

app.get("/admin/occupancy-report", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login/admin");
    }

    try {

        const [rooms] = await db.query(`
            SELECT
                id,
                room_number,
                capacity,
                occupied,
                (capacity - occupied) AS vacant
            FROM rooms
            ORDER BY room_number
        `);

        res.render("occupancy_report", {
            rooms
        });

    } catch (err) {

        console.log(err);
        res.send("Occupancy Report Error");

    }

});

// =====================================
// OCCUPANCY PERCENTAGE API
// =====================================

app.get("/admin/occupancy-percentage", async (req, res) => {

    try {

        const [[data]] = await db.query(`
            SELECT
                SUM(capacity) AS totalBeds,
                SUM(occupied) AS occupiedBeds
            FROM rooms
        `);

        const totalBeds = data.totalBeds || 0;
        const occupiedBeds = data.occupiedBeds || 0;

        const percentage =
            totalBeds === 0 ? 0 : Math.round((occupiedBeds / totalBeds) * 100);

        res.json({
            totalBeds,
            occupiedBeds,
            vacantBeds: totalBeds - occupiedBeds,
            percentage
        });

    } catch (err) {

        console.log(err);
        res.json({
            totalBeds: 0,
            occupiedBeds: 0,
            vacantBeds: 0,
            percentage: 0
        });

    }

});

// =====================================
// ROOM CHART DATA API
// =====================================

app.get("/admin/room-chart-data", async (req, res) => {

    try {

        const [rooms] = await db.query(`
            SELECT
                room_number,
                capacity,
                occupied,
                (capacity - occupied) AS vacant
            FROM rooms
            ORDER BY room_number
        `);

        res.json({
            labels: rooms.map(r => "Room " + r.room_number),
            occupied: rooms.map(r => r.occupied || 0),
            vacant: rooms.map(r => (r.capacity || 0) - (r.occupied || 0)),
            capacity: rooms.map(r => r.capacity || 0)
        });

    } catch (err) {

        console.log(err);
        res.json({
            labels: [],
            occupied: [],
            vacant: [],
            capacity: []
        });

    }

});

// =====================================
// VACANT BEDS API
// =====================================

app.get("/admin/vacant-beds", async (req, res) => {

    try {

        const [[beds]] = await db.query(`
            SELECT
                SUM(capacity - occupied) AS vacant
            FROM rooms
        `);

        res.json({
            vacantBeds: beds.vacant || 0
        });

    } catch (err) {

        console.log(err);
        res.json({
            vacantBeds: 0
        });

    }

});

// =====================================
// FULL ROOMS API
// =====================================

app.get("/admin/full-rooms", async (req, res) => {

    try {

        const [rooms] = await db.query(`
            SELECT *
            FROM rooms
            WHERE occupied >= capacity
            ORDER BY room_number
        `);

        res.json(rooms);

    } catch (err) {

        console.log(err);
        res.json([]);

    }

});

// =====================================
// AVAILABLE ROOMS PAGE
// =====================================

app.get("/admin/available-rooms", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login/admin");
    }

    try {

        const [rooms] = await db.query(`
            SELECT
                *,
                (capacity - occupied) AS vacant
            FROM rooms
            WHERE occupied < capacity
            ORDER BY room_number
        `);

        res.render("available_rooms", {
            rooms
        });

    } catch (err) {

        console.log(err);
        res.send("Available Rooms Error");

    }

});

// =====================================
// DASHBOARD STATISTICS API
// =====================================

app.get("/admin/dashboard-stats", async (req, res) => {

    try {

        const [[students]] = await db.query(
            "SELECT COUNT(*) AS total FROM students"
        );

        const [[approvedStudents]] = await db.query(
            "SELECT COUNT(*) AS total FROM students WHERE status='Approved'"
        );

        const [[pendingStudents]] = await db.query(
            "SELECT COUNT(*) AS total FROM students WHERE status='Pending'"
        );

        const [[rooms]] = await db.query(
            "SELECT COUNT(*) AS total FROM rooms"
        );

        const [[beds]] = await db.query(`
            SELECT
                SUM(capacity) AS totalBeds,
                SUM(occupied) AS occupiedBeds
            FROM rooms
        `);

        const [[income]] = await db.query(`
            SELECT SUM(amount) AS total
            FROM payments
            WHERE status='Approved'
        `);

        const [[expenses]] = await db.query(`
            SELECT SUM(amount) AS total
            FROM expenses
        `);

        const [[complaints]] = await db.query(`
            SELECT COUNT(*) AS total
            FROM complaints
            WHERE status='Pending'
        `);

        res.json({
            totalStudents: students.total || 0,
            approvedStudents: approvedStudents.total || 0,
            pendingStudents: pendingStudents.total || 0,
            totalRooms: rooms.total || 0,
            totalBeds: beds.totalBeds || 0,
            occupiedBeds: beds.occupiedBeds || 0,
            vacantBeds: (beds.totalBeds || 0) - (beds.occupiedBeds || 0),
            totalIncome: income.total || 0,
            totalExpenses: expenses.total || 0,
            profit: (income.total || 0) - (expenses.total || 0),
            pendingComplaints: complaints.total || 0
        });

    } catch (err) {

        console.log(err);
        res.json({});

    }

});

// =====================================
// REVENUE PREDICTION API
// =====================================

app.get("/admin/revenue-prediction", async (req, res) => {

    try {

        const [history] = await db.query(`
            SELECT
                SUM(amount) AS total
            FROM payments
            WHERE status='Approved'
            GROUP BY MONTH(created_at)
            ORDER BY MONTH(created_at)
            LIMIT 6
        `);

        let predicted = 0;

        if (history.length > 0) {

            let total = 0;

            history.forEach(row => {
                total += Number(row.total || 0);
            });

            predicted = Math.round(total / history.length);

        }

        res.json({
            predictedIncome: predicted
        });

    } catch (err) {

        console.log(err);
        res.json({
            predictedIncome: 0
        });

    }

});
/* ==========================================================
   PART 2C-1C
   EXPORTS + PDF REPORTS + FINAL REPORTING APIs
========================================================== */

// =====================================
// EXPORT STUDENTS TO EXCEL
// =====================================

app.get("/admin/export-students", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login/admin");
    }

    try {

        const [students] = await db.query(`
            SELECT
                id,
                first_name,
                last_name,
                email,
                phone,
                room_number,
                status,
                admission_date
            FROM students
            ORDER BY id DESC
        `);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Students");

        worksheet.columns = [
            { header: "ID", key: "id", width: 10 },
            { header: "First Name", key: "first_name", width: 20 },
            { header: "Last Name", key: "last_name", width: 20 },
            { header: "Email", key: "email", width: 30 },
            { header: "Phone", key: "phone", width: 18 },
            { header: "Room", key: "room_number", width: 12 },
            { header: "Status", key: "status", width: 15 },
            { header: "Admission Date", key: "admission_date", width: 25 }
        ];

        students.forEach(student => {
            worksheet.addRow(student);
        });

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            "attachment; filename=students.xlsx"
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.log(err);
        res.send("Export Error");
    }

});

// =====================================
// EXPORT PAYMENTS TO EXCEL
// =====================================

app.get("/admin/export-payments", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login/admin");
    }

    try {

        const [payments] = await db.query(`
            SELECT
                payments.id,
                students.first_name,
                students.last_name,
                students.email,
                students.room_number,
                payments.amount,
                payments.status,
                payments.created_at
            FROM payments
            LEFT JOIN students
            ON payments.student_id = students.id
            ORDER BY payments.id DESC
        `);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Payments");

        worksheet.columns = [
            { header: "Payment ID", key: "id", width: 12 },
            { header: "First Name", key: "first_name", width: 20 },
            { header: "Last Name", key: "last_name", width: 20 },
            { header: "Email", key: "email", width: 30 },
            { header: "Room", key: "room_number", width: 12 },
            { header: "Amount", key: "amount", width: 15 },
            { header: "Status", key: "status", width: 15 },
            { header: "Date", key: "created_at", width: 25 }
        ];

        payments.forEach(payment => {
            worksheet.addRow(payment);
        });

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            "attachment; filename=payments.xlsx"
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.log(err);
        res.send("Export Error");
    }

});

// =====================================
// EXPORT EXPENSES TO EXCEL
// =====================================

app.get("/admin/export-expenses", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login/admin");
    }

    try {

        const [expenses] = await db.query(`
            SELECT *
            FROM expenses
            ORDER BY id DESC
        `);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Expenses");

        worksheet.columns = [
            { header: "ID", key: "id", width: 10 },
            { header: "Category", key: "category", width: 20 },
            { header: "Description", key: "description", width: 35 },
            { header: "Amount", key: "amount", width: 15 },
            { header: "Date", key: "expense_date", width: 20 }
        ];

        expenses.forEach(expense => {
            worksheet.addRow(expense);
        });

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            "attachment; filename=expenses.xlsx"
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.log(err);
        res.send("Export Error");
    }

});

// =====================================
// PDF PROFIT REPORT
// =====================================

app.get("/admin/pdf/profit-report", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login/admin");
    }

    try {

        const [[income]] = await db.query(`
            SELECT SUM(amount) AS total
            FROM payments
            WHERE status='Approved'
        `);

        const [[expense]] = await db.query(`
            SELECT SUM(amount) AS total
            FROM expenses
        `);

        const totalIncome = income.total || 0;
        const totalExpense = expense.total || 0;
        const profit = totalIncome - totalExpense;

        const doc = new PDFDocument();

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=profit-report.pdf"
        );

        doc.pipe(res);

        doc.fontSize(22).text("Rahma Pearl Girls PG", { align: "center" });
        doc.moveDown();
        doc.fontSize(16).text("Profit Report");
        doc.moveDown();

        doc.text(`Total Income: ₹${totalIncome}`);
        doc.text(`Total Expense: ₹${totalExpense}`);
        doc.text(`Profit: ₹${profit}`);

        doc.moveDown();
        doc.text(`Generated On: ${new Date().toLocaleString()}`);

        doc.end();

    } catch (err) {
        console.log(err);
        res.send("PDF Error");
    }

});

// =====================================
// PDF OCCUPANCY REPORT
// =====================================

app.get("/admin/pdf/occupancy-report", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login/admin");
    }

    try {

        const [rooms] = await db.query(`
            SELECT
                room_number,
                capacity,
                occupied,
                (capacity - occupied) AS vacant
            FROM rooms
            ORDER BY room_number
        `);

        const doc = new PDFDocument();

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=occupancy-report.pdf"
        );

        doc.pipe(res);

        doc.fontSize(22).text("Rahma Pearl Girls PG", { align: "center" });
        doc.moveDown();
        doc.fontSize(16).text("Room Occupancy Report");
        doc.moveDown();

        rooms.forEach(room => {
            doc.text(
                `Room ${room.room_number} | Capacity: ${room.capacity} | Occupied: ${room.occupied} | Vacant: ${room.vacant}`
            );
        });

        doc.moveDown();
        doc.text(`Generated On: ${new Date().toLocaleString()}`);

        doc.end();

    } catch (err) {
        console.log(err);
        res.send("PDF Error");
    }

});

// =====================================
// FINAL REPORT SUMMARY API
// =====================================

app.get("/admin/final-report-summary", async (req, res) => {

    try {

        const [[students]] = await db.query(
            "SELECT COUNT(*) AS total FROM students"
        );

        const [[rooms]] = await db.query(
            "SELECT COUNT(*) AS total FROM rooms"
        );

        const [[income]] = await db.query(`
            SELECT SUM(amount) AS total
            FROM payments
            WHERE status='Approved'
        `);

        const [[expense]] = await db.query(`
            SELECT SUM(amount) AS total
            FROM expenses
        `);

        const [[complaints]] = await db.query(`
            SELECT COUNT(*) AS total
            FROM complaints
            WHERE status='Pending'
        `);

        res.json({
            students: students.total || 0,
            rooms: rooms.total || 0,
            income: income.total || 0,
            expense: expense.total || 0,
            profit: (income.total || 0) - (expense.total || 0),
            pendingComplaints: complaints.total || 0
        });

    } catch (err) {
        console.log(err);
        res.json({});
    }

});
/* ==========================================================
   PART 3A
   STAFF MANAGEMENT + ATTENDANCE SYSTEM
========================================================== */

// =====================================
// STAFF LIST
// =====================================

app.get("/staff", async (req, res) => {
    try {
        const [staff] = await db.query("SELECT * FROM staff");

        res.render("staff", {
            staffMembers: staff
        });

    } catch (err) {
        console.log(err);
        res.send("Database Error");
    }
});

app.post("/staff/add", isAdmin, async (req, res) => {
    try {
        const { name, role, phone, salary } = req.body;

        await db.query(
            "INSERT INTO staff(name, role, phone, salary) VALUES (?, ?, ?, ?)",
            [name, role, phone, salary]
        );

        res.redirect("/staff");

    } catch (err) {
        console.log(err);
        res.send("Staff Add Error");
    }
});

app.get("/dashboard", (req, res) => {
    if (req.session.admin) {
        return res.redirect("/admin/dashboard");
    }

    if (req.session.student) {
        return res.redirect("/student/dashboard");
    }

    res.redirect("/login");
});

app.get("/admin/staff", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login/admin");
    }

    try {

        const [staff] = await db.query(`
            SELECT *
            FROM staff
            ORDER BY id DESC
        `);

        res.render("staff", {
            staff
        });

    } catch (err) {
        console.log(err);
        res.send("Staff Load Error");
    }

});

// =====================================
// ADD STAFF
// =====================================

app.post("/admin/staff/add", async (req, res) => {

    try {

        const {
            name,
            role,
            phone,
            salary
        } = req.body;

        await db.query(`
            INSERT INTO staff
            (
                name,
                role,
                phone,
                salary
            )
            VALUES (?,?,?,?)
        `, [
            name,
            role,
            phone,
            salary
        ]);

        res.redirect("/admin/staff");

    } catch (err) {
        console.log(err);
        return res.render("error-message",{

         title:"Staff add Failed",

         heading:"Staff Already Registered",

         message:"A staff member with this information already exists."
        })
    }    
});

// =====================================
// EDIT STAFF PAGE
// =====================================

app.get("/admin/staff/edit/:id", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login/admin");
    }

    try {

        const [rows] = await db.query(
            "SELECT * FROM staff WHERE id=?",
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.send("Staff Not Found");
        }

        res.render("edit_staff", {
            staff: rows[0]
        });

    } catch (err) {
        console.log(err);
         return res.render("error-message",{

         title:"Staff Edit Failed",

          heading:"Staff Already Registered",

          message:"A staff member with this information already exists."

        });
    }

});

// =====================================
// UPDATE STAFF
// =====================================

app.post("/admin/staff/update/:id", async (req, res) => {

    try {

        const {
            name,
            role,
            phone,
            salary
        } = req.body;

        await db.query(`
            UPDATE staff
            SET
                name=?,
                role=?,
                phone=?,
                salary=?
            WHERE id=?
        `, [
            name,
            role,
            phone,
            salary,
            req.params.id
        ]);

        res.redirect("/admin/staff");

    } catch (err) {
        console.log(err);
        return res.render("error-message",{

         title:"Staff Update Failed",

          heading:"Staff Already Registered",

          message:"A staff member with this information already exists."

        });
    }

});

// =====================================
// DELETE STAFF
// =====================================

app.post("/admin/staff/delete/:id", async (req, res) => {

    try {

        await db.query(
            "DELETE FROM staff WHERE id=?",
            [req.params.id]
        );

        res.redirect("/admin/staff");

    } catch (err) {
        console.log(err);
        return res.render("error-message",{

         title:"Staff Delete Failed",

          heading:"Staff Delete Error",

          message:"An error occurred while trying to delete the staff member."

        });
    }

});

// =====================================
// STAFF SUMMARY API
// =====================================

app.get("/admin/staff-summary", async (req, res) => {

    try {

        const [[total]] = await db.query(
            "SELECT COUNT(*) AS total FROM staff"
        );

        const [[salary]] = await db.query(
            "SELECT SUM(salary) AS total FROM staff"
        );

        res.json({
            totalStaff: total.total || 0,
            totalSalary: salary.total || 0
        });

    } catch (err) {
        console.log(err);
        res.json({
            totalStaff: 0,
            totalSalary: 0
        });
    }

});

app.get("/admin/staff/payment/:id/:status", isAdmin, async (req, res) => {
    try {
        await db.query(
            "UPDATE staff SET payment_status=? WHERE id=?",
            [req.params.status, req.params.id]
        );

        res.redirect("/admin/staff");

    } catch (err) {
        console.log(err);
        return res.render("error-message",{
            title:"Payment Update Failed",
            heading:"Payment Update Error",
            message:"An error occurred while trying to update the payment status."
        });
    }
});

// =====================================
// STUDENT ATTENDANCE PAGE
// =====================================

app.get("/student/attendance", async (req, res) => {

    if (!req.session.student) {
        return res.redirect("/login/student");
    }

    try {

        const [attendance] = await db.query(`
            SELECT *
            FROM attendance
            WHERE student_id=?
            ORDER BY id DESC
        `, [
            req.session.student.id
        ]);

        res.render("student_attendance", {
            attendance
        });

    } catch (err) {
        console.log(err);
        return res.render("error-message",{
            title:"Attendance Load Failed",
            heading:"Attendance Load Error",
            message:"An error occurred while trying to load attendance data."
        });
    }

});

// =====================================
// STUDENT ENTRY
// =====================================

app.post("/student/entry", async (req, res) => {

    if (!req.session.student) {
        return res.redirect("/login/student");
    }

    try {

        await db.query(`
            INSERT INTO attendance
            (
                student_id,
                student_email,
                entry_time
            )
            VALUES (?,?,NOW())
        `, [
            req.session.student.id,
            req.session.student.email
        ]);

        res.redirect("/student/attendance");

    } catch (err) {
        console.log(err);
        return res.render("error-message",{
            title:"Entry Failed",
            heading:"Entry Error",
            message:"An error occurred while trying to record the entry."
        });
    }

});

// =====================================
// STUDENT EXIT
// =====================================

app.post("/student/exit", async (req, res) => {

    if (!req.session.student) {
        return res.redirect("/login/student");
    }

    try {

        await db.query(`
            UPDATE attendance
            SET exit_time=NOW()
            WHERE student_id=?
            AND exit_time IS NULL
            ORDER BY id DESC
            LIMIT 1
        `, [
            req.session.student.id
        ]);

        res.redirect("/student/attendance");

    } catch (err) {
        console.log(err);
        res.send("Exit Error");
    }

});

// =====================================
// ADMIN ATTENDANCE PAGE
// =====================================

app.get("/admin/attendance", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login/admin");
    }

    try {

        const [attendance] = await db.query(`
            SELECT
                attendance.*,
                students.first_name,
                students.last_name,
                students.room_number
            FROM attendance
            LEFT JOIN students
            ON attendance.student_id = students.id
            ORDER BY attendance.id DESC
        `);

        res.render("admin_attendance", {
            attendance
        });

    } catch (err) {
        console.log(err);
        res.send("Attendance Error");
    }

});

// =====================================
// TODAY ATTENDANCE API
// =====================================

app.get("/admin/today-attendance", async (req, res) => {

    try {

        const [[entries]] = await db.query(`
            SELECT COUNT(*) AS total
            FROM attendance
            WHERE DATE(entry_time)=CURDATE()
        `);

        const [[exits]] = await db.query(`
            SELECT COUNT(*) AS total
            FROM attendance
            WHERE DATE(exit_time)=CURDATE()
        `);

        res.json({
            entries: entries.total || 0,
            exits: exits.total || 0
        });

    } catch (err) {
        console.log(err);
        res.json({
            entries: 0,
            exits: 0
        });
    }

});
/* ==========================================================
   PART 3B
   CANDIDATE ADMISSION + BOOKING + ELECTRICITY BILLING
========================================================== */

// =====================================
// CANDIDATE REGISTER PAGE
// =====================================

app.get("/candidate-register", (req, res) => {
    res.render("candidate_register");
});

// =====================================
// CANDIDATE REGISTER SUBMIT
// =====================================

app.post("/candidate-register", upload.single("document"), async (req, res) => {

    try {

        const {
            name,
            mobile,
            email,
            gender,
            dob,
            address
        } = req.body;

        await db.query(`
            INSERT INTO candidates
            (
                name,
                mobile,
                email,
                gender,
                dob,
                address,
                document,
                status,
                created_at
            )
            VALUES (?,?,?,?,?,?,?,?,NOW())
        `, [
            name,
            mobile,
            email,
            gender,
            dob,
            address,
            req.file ? req.file.filename : null,
            "Waiting"
        ]);

        await sendAdminAlert(
            "New Candidate Registered",
            `${name} submitted admission form.`
        );

        res.send("Admission Form Submitted Successfully");

    } catch (err) {
        console.log(err);
        res.send("Candidate Registration Error");
    }

});

// =====================================
// ADMIN CANDIDATES LIST
// =====================================

app.get("/admin/candidates", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login/admin");
    }

    try {

        const [candidates] = await db.query(`
            SELECT *
            FROM candidates
            ORDER BY id DESC
        `);

        res.render("candidates", {
            candidates
        });

    } catch (err) {
        console.log(err);
        res.send("Candidate Load Error");
    }

});

// =====================================
// VIEW CANDIDATE DETAILS
// =====================================

app.get("/admin/candidates/:id", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login/admin");
    }

    try {

        const [rows] = await db.query(
            "SELECT * FROM candidates WHERE id=?",
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.send("Candidate Not Found");
        }

        res.render("candidate_details", {
            candidate: rows[0]
        });

    } catch (err) {
        console.log(err);
        res.send("Candidate Details Error");
    }

});

// =====================================
// APPROVE CANDIDATE
// =====================================

app.post("/admin/candidates/approve/:id", async (req, res) => {

    try {

        const [rows] = await db.query(
            "SELECT * FROM candidates WHERE id=?",
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.send("Candidate Not Found");
        }

        const candidate = rows[0];

        const defaultPassword = "123456";
        const hash = await bcrypt.hash(defaultPassword, 10);

        const [existingStudent] = await db.query(
            "SELECT id FROM students WHERE email=?",
            [candidate.email]
        );

        if (existingStudent.length === 0) {

            await db.query(`
                INSERT INTO students
                (
                    first_name,
                    last_name,
                    email,
                    password,
                    phone,
                    gender,
                    dob,
                    address,
                    status
                )
                VALUES (?,?,?,?,?,?,?,?,?)
            `, [
                candidate.name,
                "",
                candidate.email,
                hash,
                candidate.mobile,
                candidate.gender,
                candidate.dob,
                candidate.address,
                "Approved"
            ]);

        }

        await db.query(
            "UPDATE candidates SET status='Approved' WHERE id=?",
            [req.params.id]
        );

        await sendMail(
            candidate.email,
            "Admission Approved - Rahma Pearl PG",
            `
            <h2>Admission Approved</h2>
            <p>Your admission has been approved.</p>
            <p>Email: ${candidate.email}</p>
            <p>Default Password: ${defaultPassword}</p>
            <p>Please login and change your password.</p>
            `
        );

        res.redirect("/admin/candidates");

    } catch (err) {
        console.log(err);
        res.send("Candidate Approval Error");
    }

});

// =====================================
// REJECT CANDIDATE
// =====================================

app.post("/admin/candidates/reject/:id", async (req, res) => {

    try {

        await db.query(
            "UPDATE candidates SET status='Rejected' WHERE id=?",
            [req.params.id]
        );

        res.redirect("/admin/candidates");

    } catch (err) {
        console.log(err);
        res.send("Candidate Reject Error");
    }

});

// =====================================
// DELETE CANDIDATE
// =====================================

app.post("/admin/candidates/delete/:id", async (req, res) => {

    try {

        await db.query(
            "DELETE FROM candidates WHERE id=?",
            [req.params.id]
        );

        res.redirect("/admin/candidates");

    } catch (err) {
        console.log(err);
        res.send("Candidate Delete Error");
    }

});

// =====================================
// CANDIDATE SUMMARY API
// =====================================

app.get("/admin/candidate-summary", async (req, res) => {

    try {

        const [[waiting]] = await db.query(
            "SELECT COUNT(*) AS total FROM candidates WHERE status='Waiting'"
        );

        const [[approved]] = await db.query(
            "SELECT COUNT(*) AS total FROM candidates WHERE status='Approved'"
        );

        const [[rejected]] = await db.query(
            "SELECT COUNT(*) AS total FROM candidates WHERE status='Rejected'"
        );

        const [[total]] = await db.query(
            "SELECT COUNT(*) AS total FROM candidates"
        );

        res.json({
            total: total.total || 0,
            waiting: waiting.total || 0,
            approved: approved.total || 0,
            rejected: rejected.total || 0
        });

    } catch (err) {
        console.log(err);
        res.json({
            total: 0,
            waiting: 0,
            approved: 0,
            rejected: 0
        });
    }

});

// =====================================
// BOOKINGS LIST
// =====================================

app.get("/admin/bookings", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login/admin");
    }

    try {

        const [bookings] = await db.query(`
            SELECT
                bookings.*,
                students.first_name,
                students.last_name,
                students.email,
                rooms.room_number
            FROM bookings
            LEFT JOIN students ON bookings.student_id = students.id
            LEFT JOIN rooms ON bookings.room_id = rooms.id
            ORDER BY bookings.id DESC
        `);

        res.render("bookings", {
            bookings
        });

    } catch (err) {
        console.log(err);
        res.send("Booking Load Error");
    }

});

// =====================================
// APPROVE BOOKING
// =====================================

app.post("/admin/bookings/approve/:id", async (req, res) => {

    try {

        const [rows] = await db.query(
            "SELECT * FROM bookings WHERE id=?",
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.send("Booking Not Found");
        }

        const booking = rows[0];

        const [[room]] = await db.query(
            "SELECT * FROM rooms WHERE id=?",
            [booking.room_id]
        );

        if (!room) {
            return res.send("Room Not Found");
        }

        if (room.occupied >= room.capacity) {
            return res.send("Room is full");
        }

        await db.query(`
            UPDATE students
            SET room_id=?, room_number=?
            WHERE id=?
        `, [
            room.id,
            room.room_number,
            booking.student_id
        ]);

        await db.query(
            "UPDATE rooms SET occupied=occupied+1 WHERE id=?",
            [room.id]
        );

        await db.query(
            "UPDATE bookings SET status='Approved' WHERE id=?",
            [booking.id]
        );

        res.redirect("/admin/bookings");

    } catch (err) {
        console.log(err);
        res.send("Booking Approval Error");
    }

});

// =====================================
// REJECT BOOKING
// =====================================

app.post("/admin/bookings/reject/:id", async (req, res) => {

    try {

        await db.query(
            "UPDATE bookings SET status='Rejected' WHERE id=?",
            [req.params.id]
        );

        res.redirect("/admin/bookings");

    } catch (err) {
        console.log(err);
        res.send("Booking Reject Error");
    }

});

// =====================================
// ELECTRICITY BILL PAGE
// =====================================

app.get("/admin/electricity", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login/admin");
    }

    try {

        const [bills] = await db.query(`
            SELECT *
            FROM electricity
            ORDER BY id DESC
        `);

        res.render("electricity", {
            bills
        });

    } catch (err) {
        console.log(err);
        res.send("Electricity Load Error");
    }

});

// =====================================
// ADD ELECTRICITY BILL
// =====================================

app.post("/admin/electricity/add", async (req, res) => {

    try {

        const {
            total_bill,
            month,
            year
        } = req.body;

        const [[students]] = await db.query(
            "SELECT COUNT(*) AS total FROM students WHERE status='Approved'"
        );

        const perStudent =
            students.total === 0 ? 0 : Math.round(total_bill / students.total);

        await db.query(`
            INSERT INTO electricity
            (
                total_bill,
                month,
                year,
                per_student
            )
            VALUES (?,?,?,?)
        `, [
            total_bill,
            month,
            year,
            perStudent
        ]);

        res.redirect("/admin/electricity");

    } catch (err) {
        console.log(err);
        res.send("Electricity Add Error");
    }

});

// =====================================
// DELETE ELECTRICITY BILL
// =====================================

app.post("/admin/electricity/delete/:id", async (req, res) => {

    try {

        await db.query(
            "DELETE FROM electricity WHERE id=?",
            [req.params.id]
        );

        res.redirect("/admin/electricity");

    } catch (err) {
        console.log(err);
        res.send("Electricity Delete Error");
    }

});


// =====================================
// AI ASSISTANT PAGE
// =====================================

app.get("/admin/ai-assistant", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login/admin");
    }

    res.render("ai_assistant", {
        reply: null
    });

});

// =====================================
// AI ASSISTANT REPLY
// =====================================

app.post("/admin/ai-assistant", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login/admin");
    }

    try {

        const { question } = req.body;

        if (!openai) {
            return res.render("ai_assistant", {
                reply: "OpenAI API key is not configured."
            });
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content:
                        "You are an assistant for Rahma Pearl Girls PG Management System. Give short, helpful admin guidance."
                },
                {
                    role: "user",
                    content: question
                }
            ]
        });

        const reply = completion.choices[0].message.content;

        res.render("ai_assistant", {
            reply
        });

    } catch (err) {

        console.log(err);

        res.render("ai_assistant", {
            reply: "AI assistant error."
        });

    }

});

// =====================================
// AI ASSISTANT API
// =====================================

app.post("/api/ai", async (req, res) => {

    try {

        const { message } = req.body;

        if (!openai) {
            return res.json({
                reply: "OpenAI API key is not configured."
            });
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content:
                        "You are Rahma Pearl PG assistant. Help with students, rooms, rent, complaints, and reports."
                },
                {
                    role: "user",
                    content: message
                }
            ]
        });

        res.json({
            reply: completion.choices[0].message.content
        });

    } catch (err) {

        console.log(err);

        res.json({
            reply: "Unable to process AI request."
        });

    }

});




// =====================================
// RENT REMINDER MANUAL
// =====================================

app.get("/admin/students/reminder/:id", isAdmin, async (req, res) => {
    try {
        const [[student]] = await db.query(
            "SELECT * FROM students WHERE id=?",
            [req.params.id]
        );

        if (!student) {
            return res.send("Student not found");
        }

        await transporter.sendMail({
            from: `"Rahma Pearl PG" <${process.env.EMAIL_USER}>`,
            to: student.email,
            subject: "PG Fee Payment Reminder",
            html: `
                <h2>Rahma Pearl PG</h2>
                <p>Hello ${student.first_name},</p>
                <p>This is a reminder to pay your PG fee.</p>
                <p><b>Room:</b> ${student.room_number || "Not Assigned"}</p>
                <p><b>Amount:</b> ₹5500</p>
                <p>Please pay as soon as possible.</p>
                <br>
                <p>Thank you,<br>Rahma Pearl PG</p>
            `
        });

        res.redirect("/admin/students");

    } catch (err) {
        console.log("REMINDER EMAIL ERROR:", err);
        res.send(err.message);
    }
});

app.get("/test-email", async (req, res) => {
    try {
        console.log("EMAIL_USER:", process.env.EMAIL_USER);
        console.log("EMAIL_PASS length:", process.env.EMAIL_PASS?.length);

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: "OTP Test",
            text: "Email test working"
        });

        res.send("Email sent successfully");
    } catch (err) {
        console.log(err);
        res.send(err.message);
    }
});
// =====================================
// CREATE NOTIFICATION
// =====================================

async function createNotification(message) {

    try {

        await db.query(
            "INSERT INTO notifications(message, created_at) VALUES(?, NOW())",
            [message]
        );

    } catch (err) {

        console.log("Notification Error:", err);

    }

}

// =====================================
// DAILY RENT REMINDER CRON
// Runs every day at 9 AM
// =====================================

// =====================================
// NOTIFICATION LIST
// =====================================

app.get("/admin/notifications-list", async (req, res) => {

    if (!req.session.admin) {
        return res.redirect("/login/admin");
    }

    try {

        const [notifications] = await db.query(`
            SELECT *
            FROM notifications
            ORDER BY id DESC
            LIMIT 100
        `);

        res.render("notifications", {
            notifications
        });

    } catch (err) {

        console.log(err);
        res.send("Notification Error");

    }

});

// =====================================
// NOTIFICATION API
// =====================================

app.get("/api/notifications", async (req, res) => {

    try {

        const [notifications] = await db.query(`
            SELECT *
            FROM notifications
            ORDER BY id DESC
            LIMIT 20
        `);

        res.json(notifications);

    } catch (err) {

        console.log(err);
        res.json([]);

    }

});
/* ==========================================================
   PART 4A
   FINAL SERVER STARTUP + ERROR HANDLING
========================================================== */

// =====================================
// HEALTH CHECK
// =====================================

app.get("/health", async (req, res) => {
    try {
        await db.query("SELECT 1");

        res.json({
            status: "OK",
            message: "Rahma Pearl PG server is running",
            database: "Connected",
            time: new Date()
        });

    } catch (err) {
        res.status(500).json({
            status: "ERROR",
            message: "Database not connected"
        });
    }
});

// =====================================
// SIMPLE TEST ROUTE
// =====================================

app.get("/test-db", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT DATABASE() AS database_name");
        res.json(rows[0]);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// =====================================
// LOGOUT
// =====================================

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

// =====================================
// 404 PAGE
// =====================================
app.get("/admin/guest-students", isAdmin, async (req, res) => {
    const [guests] = await db.query("SELECT * FROM guest_students ORDER BY id DESC");
    res.render("guest_students", { guests });
});

app.get("/admin/guest-students/reminder/:id", async (req, res) => {

    const [[guest]] = await db.query(
        "SELECT * FROM guest_students WHERE id=?",
        [req.params.id]
    );

    await transporter.sendMail({

        from: process.env.EMAIL_USER,

        to: guest.email,

        subject: "Mess Fee Reminder",

        html: `
        <h2>Rahma Pearl PG</h2>

        <p>Hello ${guest.name},</p>

        <p>Your monthly mess fee is <b>₹3000</b>.</p>

        <p>Please pay it as soon as possible.</p>

        <p>Thank You.</p>
        `

    });

    res.redirect("/admin/guest-students");

});

app.get("/admin/guest-students/approve/:id", async (req, res) => {

    await db.query(

        "UPDATE guest_students SET approval_status='Approved' WHERE id=?",

        [req.params.id]

    );

    res.redirect("/admin/guest-students");

});

app.post(
    "/admin/guest-students/approve/:id",
    isAdmin,
    async (req, res) => {
        try {
            const messId = req.params.id;

            const [rows] = await db.query(
                `SELECT
                    id,
                    name,
                    email,
                    approval_status
                 FROM guest_students
                 WHERE id = ?`,
                [messId]
            );

            if (rows.length === 0) {
                return res.status(404).send(
                    "Mess student not found."
                );
            }

            const messStudent = rows[0];

            await db.query(
                `UPDATE guest_students
                 SET approval_status = 'Approved'
                 WHERE id = ?`,
                [messId]
            );

            try {
                await sendApprovalEmail({
                    name:
                        messStudent.name || "Mess Student",
                    email: messStudent.email,
                    registrationType: "Mess Student"
                });
            } catch (emailError) {
                console.error(
                    "Mess approval email failed:",
                    emailError.message
                );
            }

            return res.redirect(
                "/admin/guest-students"
            );

        } catch (error) {
            console.error(
                "Mess approval error:",
                error
            );

            return res.status(500).send(
                "Unable to approve mess student."
            );
        }
    }
);


// =====================================
// GLOBAL ERROR HANDLER
// =====================================

app.use((err, req, res, next) => {
    console.error("GLOBAL ERROR:", err);

    res.status(500).send(`
        <h1>Server Error</h1>
        <p>${err.message}</p>
        <a href="/">Go Home</a>
    `);
});


app.get("/admin/guest-students", (req, res) => {

    if (!req.session.admin)
        return res.redirect("/login");

    res.render("guest_students");

});

app.get("/admin/guest-students", isAdmin, async (req, res) => {
    try {
        const [guests] = await db.query(
            "SELECT * FROM guest_students ORDER BY id DESC"
        );

        res.render("guest_students", {
            guests
        });

    } catch (err) {
        console.log(err);
        res.send(err.message);
    }
});

app.post("/admin/guest-students/add", isAdmin, async (req, res) => {
    try {
        const {
            name,
            phone,
            email,
            password,
            meal_type,
            amount,
            from_date,
            to_date
        } = req.body;

        const cleanEmail = email.trim().toLowerCase();

        const [existingGuest] = await db.query(
            `SELECT id, name, email
             FROM guest_students
             WHERE email = ?`,
            [cleanEmail]
        );

        if (existingGuest.length > 0) {
            return res.status(400).render("guest-email-exists", {
                studentName: name || "Student",
                email: cleanEmail,
                registrationType: "Mess Student",
                backUrl: "/admin/guest-students/add"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(
            `INSERT INTO guest_students
            (
                name,
                phone,
                email,
                password,
                meal_type,
                amount,
                from_date,
                to_date,
                status,
                approval_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name,
                phone,
                cleanEmail,
                hashedPassword,
                meal_type || "Full Day",
                amount || 5500,
                from_date,
                to_date,
                "Active",
                "Approved"
            ]
        );

        return res.redirect("/admin/guest-students");

    } catch (error) {
        console.error("Guest student add error:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(400).render("guest-email-exists", {
                studentName: req.body.name || "Student",
                email: req.body.email || "",
                registrationType: "Mess Student",
                backUrl: "/admin/guest-students/add"
            });
        }

        return res.status(500).render("error-message", {
            title: "Unable to Add Student",
            heading: "Something Went Wrong",
            message:
                "We could not add the student right now. Please check the details and try again."
        });
    }
});

app.get("/admin/guest-students/edit/:id", isAdmin, async (req, res) => {
    const [[guest]] = await db.query(
        "SELECT * FROM guest_students WHERE id=?",
        [req.params.id]
    );

    res.render("edit_guest_student", { guest });
});

app.post("/admin/guest-students/update/:id", isAdmin, async (req, res) => {
    try {
        const {
            name,
            phone,
            email,
            password,
            meal_type,
            amount,
            from_date,
            to_date
        } = req.body;

        await db.query(
            `UPDATE guest_students
             SET name=?,
                 phone=?,
                 email=?,
                 password=?,
                 meal_type=?,
                 amount=?,
                 from_date=?,
                 to_date=?
             WHERE id=?`,
            [
                name,
                phone,
                email,
                password,
                meal_type,
                amount,
                from_date,
                to_date,
                req.params.id
            ]
        );

        res.redirect("/admin/guest-students");

    } catch (err) {
        console.log(err);
        return res.render("error-message",{

        title:"Registration Failed",

        heading:"Student Already Registered",

       message:"An account already exists with this email address. Please use another email address or login using your existing account."

       });
    }
});

app.post("/admin/guest-students/delete/:id", isAdmin, async (req, res) => {
    await db.query(
        "DELETE FROM guest_students WHERE id=?",
        [req.params.id]
    );

    res.redirect("/admin/guest-students");
});

 // ========================================
// MESS LOGIN MIDDLEWARE
// ========================================

function isMess(req, res, next) {
    if (req.session && req.session.mess) {
        return next();
    }

    return res.redirect("/login");
}


// ========================================
// MESS DASHBOARD
// ========================================
app.get("/mess/dashboard", isMess, async (req, res) => {
    try {
        const messId = req.session.mess.id;

        const [messRows] = await db.query(
            `SELECT *
             FROM guest_students
             WHERE id = ?
             LIMIT 1`,
            [messId]
        );

        if (messRows.length === 0) {
            return req.session.destroy(() => {
                res.redirect("/login");
            });
        }

        const [attendanceRows] = await db.query(
            `SELECT *
             FROM mess_attendance
             WHERE mess_id = ?
             ORDER BY attendance_date DESC`,
            [messId]
        );

        return res.render("mess_dashboard", {
            mess: messRows[0],
            attendance: attendanceRows
        });

    } catch (error) {
        console.error("MESS DASHBOARD ERROR:", error);

        return res.status(500).send(`
            <h2>Unable to load mess dashboard</h2>
            <p>${error.message}</p>
            <a href="/login">Back to Login</a>
        `);
    }
});

app.post("/mess/attendance", isMess, async (req, res) => {
    try {
        const messId = req.session.mess.id;

        const attendanceDate =
            String(req.body.attendance_date || "").trim();

        const breakfast = req.body.breakfast ? 1 : 0;
        const lunch = req.body.lunch ? 1 : 0;
        const dinner = req.body.dinner ? 1 : 0;

        if (!attendanceDate) {
            return res.status(400).send(
                "Please select an attendance date."
            );
        }

        await db.query(
            `INSERT INTO mess_attendance
                (
                    mess_id,
                    attendance_date,
                    breakfast,
                    lunch,
                    dinner
                )
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                breakfast = VALUES(breakfast),
                lunch = VALUES(lunch),
                dinner = VALUES(dinner)`,
            [
                messId,
                attendanceDate,
                breakfast,
                lunch,
                dinner
            ]
        );

        return res.redirect("/mess/dashboard");

    } catch (error) {
        console.error("MESS ATTENDANCE ERROR:", error);

        return res.status(500).send(`
            <h2>Unable to submit attendance</h2>
            <p>${error.message}</p>
            <a href="/mess/dashboard">Back to Dashboard</a>
        `);
    }
});

app.get("/admin/mess-attendance", isAdmin, async (req, res) => {
    try {
        // Find the real columns in mess_attendance
        const [attendanceColumns] = await db.query(
            "SHOW COLUMNS FROM mess_attendance"
        );

        const columnNames = attendanceColumns.map(column => column.Field);

        let joinCondition;
        let studentReference;

        if (columnNames.includes("guest_student_id")) {
            joinCondition = "ma.guest_student_id = gs.id";
            studentReference = "ma.guest_student_id";
        } 
        else if (columnNames.includes("mess_id")) {
            joinCondition = "ma.mess_id = gs.id";
            studentReference = "ma.mess_id";
        } 
        else if (columnNames.includes("student_id")) {
            joinCondition = "ma.student_id = gs.id";
            studentReference = "ma.student_id";
        } 
        else if (columnNames.includes("student_email")) {
            joinCondition = "ma.student_email = gs.email";
            studentReference = "ma.student_email";
        } 
        else if (columnNames.includes("email")) {
            joinCondition = "ma.email = gs.email";
            studentReference = "ma.email";
        } 
        else {
            return res.status(500).render("error-message", {
                title: "Attendance Error",
                heading: "Student Information Not Connected",
                message:
                    "The mess_attendance table does not contain guest_student_id, mess_id, student_id, student_email, or email."
            });
        }

        const [records] = await db.query(`
            SELECT
                ma.*,
                ${studentReference} AS attendance_student_reference,

                gs.id AS guest_id,
                gs.name AS student_name,
                gs.email AS student_email,
                gs.phone AS student_phone,
                gs.from_date,
                gs.to_date

            FROM mess_attendance ma

            LEFT JOIN guest_students gs
                ON ${joinCondition}

            ORDER BY ma.attendance_date DESC
        `);

        return res.render("admin_mess_attendance", {
            records
        });

    } catch (err) {
        console.error("Mess attendance loading error:", err);

        return res.status(500).render("error-message", {
            title: "Attendance Error",
            heading: "Unable to Load Attendance",
            message: err.message
        });
    }
});

async function sendRegistrationEmail({
    name,
    email,
    registrationType
}) {
    const mailOptions = {
        from: `"Rahma Pearl PG" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Registration Received | Rahma Pearl PG`,

        html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">

            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background: #eef7f5;
                    font-family: Arial, sans-serif;
                    color: #294746;
                }

                .wrapper {
                    padding: 30px 15px;
                }

                .container {
                    max-width: 650px;
                    margin: auto;
                    background: #ffffff;
                    border-radius: 18px;
                    overflow: hidden;
                    box-shadow: 0 12px 35px rgba(0, 0, 0, 0.12);
                }

                .header {
                    padding: 32px;
                    text-align: center;
                    background: linear-gradient(
                        135deg,
                        #087f73,
                        #064d49
                    );
                    color: #ffffff;
                }

                .header h1 {
                    margin: 0 0 8px;
                }

                .content {
                    padding: 30px;
                }

                .welcome-box {
                    padding: 18px;
                    margin-bottom: 20px;
                    background: #ecfaf7;
                    border-left: 5px solid #0e9f8d;
                    border-radius: 10px;
                }

                .status {
                    display: inline-block;
                    padding: 8px 16px;
                    background: #fff2c9;
                    color: #745500;
                    border-radius: 30px;
                    font-weight: bold;
                }

                .feature {
                    padding: 13px;
                    margin-bottom: 10px;
                    background: #f7fbfa;
                    border: 1px solid #dbece9;
                    border-radius: 10px;
                }

                .condition-box {
                    margin-top: 22px;
                    padding: 18px;
                    background: #fff8e1;
                    border: 1px solid #efdc94;
                    border-radius: 12px;
                }

                .footer {
                    padding: 22px;
                    text-align: center;
                    background: #063f3c;
                    color: #d7eeee;
                    font-size: 13px;
                }
            </style>
        </head>

        <body>

            <div class="wrapper">

                <div class="container">

                    <div class="header">

                        <h1>Rahma Pearl PG</h1>

                        <p>
                            Comfortable living, healthy food and
                            a student-friendly environment.
                        </p>

                    </div>

                    <div class="content">

                        <h2>Hello ${name},</h2>

                        <div class="welcome-box">

                            Thank you for registering with
                            <strong>Rahma Pearl PG</strong>.

                            We have successfully received your
                            <strong>${registrationType}</strong>
                            registration.

                        </div>

                        <p>
                            Current account status:
                            <span class="status">Pending Approval</span>
                        </p>

                        <p>
                            Our administrator will verify your information.
                            You can log in to the website after your account
                            is approved.
                        </p>

                        <h3>Why students choose Rahma Pearl PG</h3>

                        <div class="feature">
                            ✅ Safe and peaceful student accommodation
                        </div>

                        <div class="feature">
                            ✅ Fresh and hygienic home-style food
                        </div>

                        <div class="feature">
                            ✅ Clean and properly maintained rooms
                        </div>

                        <div class="feature">
                            ✅ Wi-Fi and study-friendly environment
                        </div>

                        <div class="feature">
                            ✅ Quick support for rooms, food and payments
                        </div>

                        <div class="condition-box">

                            <strong>Important information</strong>

                            <p>
                                Please enter only correct and valid details
                                during registration.
                            </p>

                            <p>
                                Your phone number and email address help us
                                contact you and send important PG information,
                                payment updates, food notices and account
                                notifications.
                            </p>

                            <p>
                                Please verify that your Gmail address is
                                correct and active. Incorrect email details
                                may prevent you from receiving approval and
                                important updates.
                            </p>

                        </div>

                    </div>

                    <div class="footer">

                        Rahma Pearl PG<br>

                        A comfortable place to stay, study and grow.

                    </div>

                </div>

            </div>

        </body>
        </html>
        `
    };

    await transporter.sendMail(mailOptions);
}

async function sendApprovalEmail({
    name,
    email,
    registrationType
}) {
    const mailOptions = {
        from: `"Rahma Pearl PG" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Welcome to Rahma Pearl PG – Account Approved`,

        html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">

            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background: #edf8f6;
                    font-family: Arial, sans-serif;
                    color: #284b49;
                }

                .wrapper {
                    padding: 30px 15px;
                }

                .container {
                    max-width: 650px;
                    margin: auto;
                    background: #ffffff;
                    border-radius: 18px;
                    overflow: hidden;
                    box-shadow: 0 12px 35px rgba(0, 0, 0, 0.13);
                }

                .header {
                    padding: 38px 25px;
                    text-align: center;
                    background: linear-gradient(
                        135deg,
                        #0e9f8d,
                        #065b55
                    );
                    color: #ffffff;
                }

                .check-icon {
                    width: 75px;
                    height: 75px;
                    margin: auto;
                    line-height: 75px;
                    border-radius: 50%;
                    background: #ffffff;
                    color: #087f73;
                    font-size: 40px;
                    font-weight: bold;
                }

                .content {
                    padding: 32px;
                }

                .approved-box {
                    padding: 18px;
                    margin: 20px 0;
                    background: #e5faf4;
                    border-left: 5px solid #10a37f;
                    border-radius: 10px;
                }

                .feature {
                    padding: 12px;
                    margin-bottom: 9px;
                    background: #f5fbfa;
                    border-radius: 9px;
                }

                .button-box {
                    margin: 28px 0;
                    text-align: center;
                }

                .login-button {
                    display: inline-block;
                    padding: 14px 28px;
                    background: #087f73;
                    color: #ffffff !important;
                    text-decoration: none;
                    border-radius: 10px;
                    font-weight: bold;
                }

                .condition-box {
                    padding: 18px;
                    margin-top: 20px;
                    background: #fff8df;
                    border: 1px solid #efdc95;
                    border-radius: 12px;
                }

                .footer {
                    padding: 22px;
                    text-align: center;
                    background: #064b47;
                    color: #d9f0ed;
                    font-size: 13px;
                }
            </style>
        </head>

        <body>

            <div class="wrapper">

                <div class="container">

                    <div class="header">

                        <div class="check-icon">✓</div>

                        <h1>Account Approved!</h1>

                        <p>
                            Welcome to the Rahma Pearl PG family.
                        </p>

                    </div>

                    <div class="content">

                        <h2>Hello ${name},</h2>

                        <div class="approved-box">

                            Congratulations! Your
                            <strong>${registrationType}</strong>
                            account has been approved by the administrator.

                        </div>

                        <p>
                            Thank you for joining
                            <strong>Rahma Pearl PG</strong>.
                        </p>

                        <p>
                            You can now log in to the website using your
                            registered email address and password.
                        </p>

                        <div class="button-box">

                            <a
                                href="http://localhost:3000/login"
                                class="login-button"
                            >
                                Login to Rahma Pearl PG
                            </a>

                        </div>

                        <h3>Your Rahma Pearl PG benefits</h3>

                        <div class="feature">
                            🏠 Comfortable and properly maintained rooms
                        </div>

                        <div class="feature">
                            🍲 Fresh, healthy and home-style meals
                        </div>

                        <div class="feature">
                            🔐 Safe and student-friendly environment
                        </div>

                        <div class="feature">
                            📶 Wi-Fi and study-supportive facilities
                        </div>

                        <div class="feature">
                            🤝 Helpful management and quick assistance
                        </div>

                        <div class="condition-box">

                            <strong>Important conditions</strong>

                            <p>
                                Please keep your registered mobile number
                                and email address active.
                            </p>

                            <p>
                                We will use your contact details for payment
                                reminders, food updates, room information,
                                important notices and emergency communication.
                            </p>

                            <p>
                                Do not share your website password with anyone.
                                You are responsible for activity performed
                                through your account.
                            </p>

                            <p>
                                Please immediately inform the administration
                                when your phone number, email or personal
                                details change.
                            </p>

                        </div>

                    </div>

                    <div class="footer">

                        Thank you for joining Rahma Pearl PG.<br>

                        Stay comfortably. Study peacefully.
                        Build your future confidently.

                    </div>

                </div>

            </div>

        </body>
        </html>
        `
    };

    await transporter.sendMail(mailOptions);
}


// =====================================
// START SERVER
// =====================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("======================================");
    console.log(`Rahma Pearl PG running on port ${PORT}`);
    console.log(`Open: http://localhost:${PORT}`);
    console.log("======================================");
});