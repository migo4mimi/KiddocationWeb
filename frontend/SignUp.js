// ...existing code...
import { GoogleLogin } from 'react-google-login';
import FacebookLogin from 'react-facebook-login/dist/facebook-login-render-props';
import axios from 'axios';

const SignUp = () => {
    // ...existing code...

    const handleGoogleSuccess = async (response) => {
        try {
            const { tokenId } = response;
            const res = await axios.post('/api/auth/google-signup', { token: tokenId });
            localStorage.setItem('token', res.data.token);
            window.location.href = '/dashboard'; // Redirect after login
        } catch (error) {
            console.error('Google sign-up failed', error);
        }
    };

    const handleFacebookSuccess = async (response) => {
        try {
            const { accessToken } = response;
            const res = await axios.post('/api/auth/facebook-signup', { token: accessToken });
            localStorage.setItem('token', res.data.token);
            window.location.href = '/dashboard'; // Redirect after login
        } catch (error) {
            console.error('Facebook sign-up failed', error);
        }
    };

    return (
        <div>
            {/* ...existing code... */}
            <GoogleLogin
                clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}
                onSuccess={handleGoogleSuccess}
                onFailure={(error) => console.error('Google login error', error)}
                render={(renderProps) => (
                    <button onClick={renderProps.onClick} disabled={renderProps.disabled}>
                        Sign up with Google
                    </button>
                )}
            />
            <FacebookLogin
                appId={process.env.REACT_APP_FACEBOOK_APP_ID}
                autoLoad={false}
                callback={handleFacebookSuccess}
                render={(renderProps) => (
                    <button onClick={renderProps.onClick}>
                        Sign up with Facebook
                    </button>
                )}
            />
            {/* ...existing code... */}
        </div>
    );
};

export default SignUp;
