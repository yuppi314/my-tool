FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# SQLiteのデータファイルを永続化したい場合はこのディレクトリをボリュームにマウントする
VOLUME ["/app/data"]

ENV PORT=3000
EXPOSE 3000

CMD ["node", "src/server.js"]
