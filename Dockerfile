# Use Node.js 22 Alpine for smaller image size
FROM node:22-alpine

# No need to install additional packages - wget is available by default

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src/ ./src/
COPY docs/ ./docs/

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]