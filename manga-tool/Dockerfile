FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

# SQLiteのデータファイルを永続化したい場合はこのディレクトリをボリュームにマウントする
VOLUME ["/app/data"]

ENV PORT=3100
EXPOSE 3100

CMD ["node", "src/server.js"]
