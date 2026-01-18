FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
# Ensure we use public registry
RUN echo "registry=https://registry.npmjs.org/" > .npmrc
RUN npm install

COPY . .

CMD ["npm", "run", "dev", "--", "--host"]
