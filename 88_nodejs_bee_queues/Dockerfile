# Sử dụng image Node.js chính thức
FROM node:latest

# Thiết lập thư mục làm việc
WORKDIR /usr/src/app

# Copy các file package và cài đặt dependencies
COPY package*.json ./
RUN npm install

# Copy toàn bộ mã nguồn vào container
COPY . .

# Cài đặt pm2 toàn cục
RUN npm install pm2 -g

# Expose cổng mà ứng dụng sẽ chạy
EXPOSE 3000

# Thiết lập command mặc định cho container
CMD ["pm2-runtime", "start", "pm2-app.json"]
