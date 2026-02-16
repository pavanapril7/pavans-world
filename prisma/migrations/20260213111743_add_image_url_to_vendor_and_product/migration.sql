-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "imageUrl" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "imageUrl" TEXT;
