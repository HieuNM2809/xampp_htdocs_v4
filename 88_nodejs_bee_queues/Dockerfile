# Sử dụng image Node.js chính thức
FROM node:latest

# Thêm các công cụ editor (vim, nano)
RUN apt update && apt install -y nano vim

# Thiết lập thư mục làm việc
WORKDIR /usr/src/app

# Copy các file package và cài đặt dependencies
COPY package*.json ./
RUN npm install

# Copy toàn bộ mã nguồn vào container
COPY . .

# Cài đặt pm2 toàn cục
RUN npm install pm2 -g

# Cài đặt nodemon toàn cục
RUN npm install -g nodemon

# Expose cổng mà ứng dụng sẽ chạy
EXPOSE 3000

# Thiết lập command mặc định cho container
CMD ["pm2-runtime", "start", "pm2-app.json"]

# Use nodemon for development
# CMD ["nodemon", "--watch", ".", "server.js"]


