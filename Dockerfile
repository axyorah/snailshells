# get base image
FROM alpine

# set working dir
WORKDIR '/shells'

# get node and npm
RUN apk add --update npm

# get dependencies
COPY ./package.json ./
RUN npm install
RUN npm install http-server -g

# copy local files
COPY ./ ./

# set command to run at start up
CMD ["/bin/ash", "/shells/start.sh"]
