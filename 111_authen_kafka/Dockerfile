# Sử dụng Node.js 18 LTS Alpine image
FROM node:18-alpine

# Tạo thư mục ứng dụng
WORKDIR /app

# Sao chép package files
COPY package*.json ./

# Cài đặt dependencies
RUN npm i

# Sao chép source code
COPY . .

# Tạo user non-root để chạy ứng dụng
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Chuyển ownership của thư mục app cho user nodejs
RUN chown -R nodejs:nodejs /app

# Chuyển sang user nodejs
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Command để chạy ứng dụng
CMD ["npm", "start"]
