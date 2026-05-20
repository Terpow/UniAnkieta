
FROM node:20-slim

WORKDIR /app

# Kopiujemy zależności
COPY package*.json ./

RUN npm install

# copiujemy kod
COPY . .

#port dlaVite
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]