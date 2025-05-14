// presigned-demo/app/index.js
const express = require('express');
const path = require('path');
const {
    S3Client,
    CreateBucketCommand,
    PutBucketCorsCommand,   // ← import thêm
    PutObjectCommand,
    GetObjectCommand
} = require('@aws-sdk/client-s3');
const {getSignedUrl} = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const app = express();
const port = 3000;

// Định nghĩa CORS rules cho bucket
const corsRules = [
    {
        AllowedOrigins: ['http://localhost:3000'],
        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        AllowedHeaders: ['*'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3600
    }
];

// Đọc config từ env
const {
    AWS_REGION,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    S3_ENDPOINT,
    S3_BUCKET
} = process.env;

// Khởi tạo S3Client cho MinIO
const s3 = new S3Client({
    region: AWS_REGION,
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY
    },
    endpoint: S3_ENDPOINT,
    forcePathStyle: true
});

// Serve static UI và parse JSON
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

async function main() {
    // 1) Tạo bucket (nếu chưa tồn tại)
    try {
        await s3.send(new CreateBucketCommand({Bucket: S3_BUCKET}));
        console.log(`✔ Bucket "${S3_BUCKET}" created.`);
    } catch (err) {
        if (err.name === 'BucketAlreadyOwnedByYou') {
            console.log(`ℹ Bucket "${S3_BUCKET}" already exists.`);
        } else {
            console.error('✖ Error creating bucket:', err);
            process.exit(1);
        }
    }

    // tạo presigned PUT URL
    app.post('/api/upload-url', async (req, res) => {
        const {filename} = req.body;
        if (!filename) {
            return res.status(400).json({error: 'Missing filename'});
        }
        const cmd = new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: filename
        });
        const url = await getSignedUrl(s3, cmd, {expiresIn: 3600});
        res.json({url});
    });

    // tạo presigned GET URL
    app.get('/api/download-url', async (req, res) => {
        const {filename} = req.query;
        if (!filename) {
            return res.status(400).json({error: 'Missing filename'});
        }
        const cmd = new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: filename
        });
        const url = await getSignedUrl(s3, cmd, {expiresIn: 2});
        res.json({url});
    });

    // 4) Khởi động Express
    app.listen(port, () => {
        console.log(`🚀 Server running at http://localhost:${port}`);
    });
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
