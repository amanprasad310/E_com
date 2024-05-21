require('dotenv').config();
const express = require('express');
const session = require('express-session');
const server = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const passport = require('passport');
const { IoContractOutline } = require('react-icons/io5');
require('./oauth');

main().catch(err => console.log(err));

async function main() {
    await mongoose.connect('mongodb://localhost:27017/register');
    // 'mongodb+srv://kumardurgesh:kumardurgesh123@compassp.quqiect.mongodb.net/register'
    console.log("db CONNECTED");
    // mongodb://localhost:27017/
}

const usersSchama = new mongoose.Schema({
    firstname: String,
    lastname: String,
    email: {
        type: String,
        unique: true
    },
    password: String,
    cpass: String
});

const TrandingProductSchema = new mongoose.Schema({
    imgUrl: String,
    pname: String,
    description: String,
    price: Number
});

const Aircatrgory = new mongoose.Schema({
    imgUrl: String,
    pname: String,
    price: Number,
    categrory: String,
    description: String

})

const product = mongoose.model('TrandingProduct', TrandingProductSchema);
const User = mongoose.model('User', usersSchama);
const categrory = mongoose.model('Aircatrgory', Aircatrgory)

function isLoggdin(req, res, next) {
    req.user ? next() : res.status(401).send({ message: 'Unauthorized: User not logged in' });
}


server.use(cors());
server.use(bodyParser.json());
server.use(express.json());

// Session middleware
server.use(session({
    secret: 'mysecret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Initialize Passport
server.use(passport.initialize());
server.use(passport.session());

server.post('/register', async (req, res) => {
    try {
        let user = new User();
        user.firstname = req.body.firstname;
        user.lastname = req.body.lastname;
        user.email = req.body.email;
        user.password = req.body.password;
        user.cpass = req.body.cpass;
        const doc = await user.save();
        res.json(doc);
    } catch (e) {
        console.log(e);
        res.status(500).json({
            error: e
        });
    }
});

function comaprePass(inputPassword, storedPassword) {
    // console.log(inputPassword, storedPassword)
    if (inputPassword == null || storedPassword == null) {
        console.log("null value ocure")
        return;
    }
    if (inputPassword.length !== storedPassword.length) {
        return false;
    }

    let isEqual = true;
    for (let i = 0; i < inputPassword.length; i++) {
        if (inputPassword[i] !== storedPassword[i]) {
            isEqual = false;
        }
    }

    return isEqual;
}

server.get('/trending-products', async (req, res) => {
    try {
        const treandingProduct = await product.find().limit(6);
        res.json(treandingProduct);
    } catch (err) {
        console.error("Error fetching trending products:", err);
        res.status(500).json({ message: 'Error fetching trending products', error: err.message });
    }
});

server.get('/find-products/:id', async (req, res) => {
    const productId = req.params['id'];
    try {
        const pro = await product.findOne({ _id: productId });
        if (!pro) {
            return res.status(404).json({ message: 'Product not found' });
        }
        return res.json(pro);
    } catch (err) {
        console.error("Error fetching product:", err);
        res.status(500).json({ message: 'Error fetching product', error: err.message });
    }
});

server.post('/login', async (req, res) => {
    const { email, password } = req.body;
    // console.log(email, passport)
    try {
        const validUser = await User.findOne({ email });
        // console.log(validUser)
        if (!validUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        // console.log(validUser.password)
        const isMatch = password && comaprePass(password, validUser.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const Token = jwt.sign(
            { userId: validUser._id, userEmail: validUser.email },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );
        res.json({ message: 'Login successful', user: validUser, Token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

server.get('/get-data/:email', async (req, res) => {
    const userEmail = req.params.email;
    try {
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const userData = {
            name: `${user.firstname} `,
            email: user.email,
            password: user.password
        };
        res.json(userData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

server.post('/update-data', async (req, res) => {
    const { email, firstname, lastname, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (firstname) {
            user.firstname = firstname;
        }
        if (lastname) {
            user.lastname = lastname;
        }
        if (password) {
            user.password = password;
        }
        if (email) {
            user.email = email;
        }
        await user.save();
        res.status(200).json({ message: 'User data updated successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Error updating user data', error });
    }
});

server.delete('/delete-data/:email', async (req, res) => {
    try {
        const emailDelete = req.params.email;
        const user = await User.findOneAndDelete({ email: emailDelete });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});



server.post('/forget-pass', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ status: "User not found" });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'dk1570801@gmail.com',
                pass: 'leuyvrzpzzjkotbn'
            }
        });
        // console.log(transporter)
        const mailOptions = {
            from: 'E-COM',
            to: email,
            subject: 'Password Reset Request',
            text: `Hello ${user.firstname},\n\nYou have requested to reset your password. Please click on the following link to reset your password:\n\nhttp://localhost:8080/reset-password?token=${token}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n`
        };
        // console.log(mailOptions)
        const result = await transporter.sendMail(mailOptions);
        console.log('Email sent:', result.response);
        res.status(200).json({ message: 'Password reset email sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



// Reset Password Endpoint
// Function to send email using Nodemailer


server.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
    }

    try {
        const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



// server.get('/reset-password', (req, res) => {
//     const token = req.query.token;
//     const pageContent = `Reset Password Page with Token: ${token}`;
//     res.send(pageContent);
// });



server.get('/auth/google',
    passport.authenticate('google', {
        scope: ['email', 'profile']
    })
);

server.get('/auth/google/callback',
    passport.authenticate('google', {
        successRedirect: '/auth/google/success',
        failureRedirect: '/auth/google/failure'
    })
);

server.get('/auth/google/success', isLoggdin, async (req, res) => {
    try {
        const { id, displayName, emails } = req.user;
        let existingUser = await User.findOne({ email: emails[0].value });

        if (!existingUser) {
            const newUser = new User({
                firstname: displayName,
                lastname: '',
                email: emails[0].value,
                password: '123456',
                cpass: '123456'
            });

            await newUser.save();
            // console.log( newUser);
        }
        // console.log("/")
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Error saving Google user to database:', error);
        res.status(500).json({ message: 'Server error' });
    }

});


server.get('/auth/google/failure', (req, res) => {
    res.send('Something went wrong ');
});


// all product
// console.log(Aircatrgory)
server.get('/products', async (req, res) => {
    try {
        const Allproduct = await categrory.find();
        res.json(Allproduct);
    } catch (err) {
        console.error("Error fetching trending products:", err);
        res.status(500).json({ message: 'Error fetching trending products', error: err.message });
    }
});

server.post('/send-email', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'dk1570801@gmail.com',
                pass: 'leuyvrzpzzjkotbn'
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Notification Enrollment ',
            text: `Hello, We will notify soon . Thanku for showing intrest ❤️.`
        };

        const result = await transporter.sendMail(mailOptions);
        // console.log('Email sent:', result.response);
        res.status(200).json({ message: 'Email sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

server.post('/order-email', async (req, res) => {
    const { email, orderDetails } = req.body;
    if (!email || !orderDetails) return res.status(400).json({ message: 'Email and order details are required' });

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'dk1570801@gmail.com',
                pass: 'leuyvrzpzzjkotbn'
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Order Confirmation',
            text: `Hello,\n\nYour order has been placed successfully. Here are your order details:\n${JSON.stringify(orderDetails, null, 2)}\n\nThank you for shopping with us!`
        };

        const result = await transporter.sendMail(mailOptions);
        // console.log('Order confirmation email sent:', result.response);
        res.status(200).json({ message: 'Order placed and email sent successfully' });
    } catch (error) {
        console.error('Error sending order confirmation email:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

server.get('/register', async (req, res) => {
    const docs = await User.find({});
    res.json(docs);
});


server.listen(8080, () => {
    console.log('server started');
});
