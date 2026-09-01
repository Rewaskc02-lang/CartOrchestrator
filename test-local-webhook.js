import crypto from 'crypto';
import 'dotenv/config';

const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'my_custom_webhook_secret_123';
const razorpayOrderId = 'order_TWTzCGOwjhZIEi'; // The Razorpay order ID from your created order

const payload = {
    event: 'payment.captured',
    payload: {
        payment: {
            entity: {
                id: 'pay_test_' + Date.now().toString().slice(-6),
                order_id: razorpayOrderId,
                amount: 18999,
                status: 'captured',
                method: 'card',
                email: 'shopper_sessio@example.com',
                contact: '+919876543210',
            },
        },
    },
};

const rawBody = JSON.stringify(payload);
const signature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

async function triggerWebhook() {
    try {
        const response = await fetch('http://localhost:5001/webhook/razorpay', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-razorpay-signature': signature,
            },
            body: rawBody,
        });

        const data = await response.json();
        console.log('Webhook Response from Server:', data);
    } catch (error) {
        console.error('Error triggering webhook:', error.message);
    }
}

triggerWebhook();