#!/bin/bash

# Setup script to link Prisma schema from main project

echo "Setting up Prisma schema link..."

# Check if prisma directory already exists
if [ -d "prisma" ]; then
  echo "Prisma directory already exists. Removing..."
  rm -rf prisma
fi

# Create symlink to parent prisma directory
ln -s ../prisma ./prisma

echo "Prisma schema linked successfully!"
echo "Run 'npx prisma generate' to generate Prisma Client"
