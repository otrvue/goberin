import axios from "axios";
import crypto from "crypto";

const DOMPETX_URL = "https://api.dompetx.com/v1";
const apiKey = "dompk_5d5e690a39adb2904c8674b83da1bd0d9068b74f1ae3006c3e51969b11338e35";
const transactionId = "fc2ef1be-6789-47c1-9d5d-29caefee3538";

function generateSignature(apiKey, timestamp, body) {
    const bodyString = typeof body === "string" ? body : JSON.stringify(body);
    const signatureData = timestamp + "." + bodyString;
    return crypto
        .createHmac("sha256", apiKey)
        .update(signatureData)
        .digest("hex");
}

async function getDetail() {
    const timestamp = Math.floor(Date.now() / 1000);
    const body = "";
    const signature = generateSignature(apiKey, timestamp, body);

    try {
        const response = await axios.get(`${DOMPETX_URL}/payments/detail/${transactionId}`, {
            headers: {
                "X-DOMPAY-API-Key": apiKey,
                "X-DOMPAY-Signature": signature,
                "X-DOMPAY-Timestamp": timestamp
            }
        });
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error(JSON.stringify(error.response?.data || error.message, null, 2));
    }
}

getDetail();
