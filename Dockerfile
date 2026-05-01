FROM apify/actor-node-puppeteer-chrome:18

COPY package*.json ./
RUN npm install --omit=dev

COPY . ./

CMD npm start
