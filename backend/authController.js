// ...existing code...
const { OAuth2Client } = require('google-auth-library');
const fetch = require('node-fetch');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google OAuth handler
exports.googleSignUp = async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { email, name } = payload;

        // Auto-login logic
        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({ email, name, provider: 'google' });
        }
        const jwtToken = generateJwtToken(user);
        res.status(200).json({ token: jwtToken });
    } catch (error) {
        res.status(400).json({ error: 'Google authentication failed' });
    }
};

// Facebook OAuth handler
exports.facebookSignUp = async (req, res) => {
    const { token } = req.body;
    try {
        const response = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${token}`);
        const data = await response.json();
        const { email, name } = data;

        // Auto-login logic
        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({ email, name, provider: 'facebook' });
        }
        const jwtToken = generateJwtToken(user);
        res.status(200).json({ token: jwtToken });
    } catch (error) {
        res.status(400).json({ error: 'Facebook authentication failed' });
    }
};
// ...existing code...
