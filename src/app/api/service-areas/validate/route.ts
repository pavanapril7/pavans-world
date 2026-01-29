import { NextRequest, NextResponse } from 'next/server';
import { validateAddressSchema, validatePincodeSchema } from '@/schemas/service-area.schema';
import { ZodError } from 'zod';
import { GeoValidationService } from '@/services/geo-validation.service';

/**
 * POST /api/service-areas/validate
 * Validate if an address or pincode is within a service area
 * Body: { street, landmark?, city, state, pincode } OR { pincode }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if it's a full address validation or just pincode
    let validationResult;
    
    if (body.street && body.city && body.state) {
      // Full address validation
      const validatedData = validateAddressSchema.parse(body);
      validationResult = await GeoValidationService.validateAddress(validatedData);
    } else if (body.pincode) {
      // Pincode-only validation
      const validatedData = validatePincodeSchema.parse(body);
      validationResult = await GeoValidationService.validatePincode(validatedData.pincode);
    } else {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Either provide full address (street, city, state, pincode) or just pincode',
        },
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      data: validationResult,
    }, { status: 200 });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
      }, { status: 400 });
    }
    
    // Handle other errors
    console.error('Error validating address:', error);
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to validate address',
      },
    }, { status: 500 });
  }
}

/**
 * GET /api/service-areas/validate
 * Get all serviceable pincodes
 */
export async function GET() {
  try {
    const pincodes = await GeoValidationService.getServiceablePincodes();
    
    return NextResponse.json({
      success: true,
      data: {
        pincodes,
        count: pincodes.length,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching serviceable pincodes:', error);
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch serviceable pincodes',
      },
    }, { status: 500 });
  }
}
