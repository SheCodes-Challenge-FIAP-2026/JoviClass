const {
    S3Client
} = require("@aws-sdk/client-s3");

const r2 = new S3Client({
    region: "auto",

    endpoint: process.env.R2_ENDPOINT,

    credentials: {
        accessKeyId:
            process.env.R2_ACCESS_KEY_ID,

        secretAccessKey:
            process.env.R2_SECRET_ACCESS_KEY
    }
});

const R2_BUCKET_NAME =
    process.env.R2_BUCKET_NAME;

module.exports = {
    r2,
    R2_BUCKET_NAME
};