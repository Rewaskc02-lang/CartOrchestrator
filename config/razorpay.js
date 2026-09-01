import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Initializes and exports the Razorpay SDK instance using environment variables.
 */
const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

if (!key_id || !key_secret || key_id.includes('placeholder')) {
  console.warn(
    '[Razorpay Config] Warning: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET contains placeholder values. Live/test Razorpay API calls will fail until you provide valid test keys in .env.'
  );
}

export const razorpayInstance = new Razorpay({
  key_id: key_id || 'rzp_test_placeholder',
  key_secret: key_secret || 'placeholder_secret',
});

export default razorpayInstance;
