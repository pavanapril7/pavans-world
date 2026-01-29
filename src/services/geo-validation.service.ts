import { ServiceAreaService } from './service-area.service';

export interface AddressValidationInput {
  street: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface ValidationResult {
  isValid: boolean;
  serviceArea?: {
    id: string;
    name: string;
    city: string;
    state: string;
  };
  message?: string;
}

export class GeoValidationService {
  /**
   * Validate if an address is within a service area
   */
  static async validateAddress(address: AddressValidationInput): Promise<ValidationResult> {
    // Validate required fields
    if (!address.pincode || !address.city || !address.state || !address.street) {
      return {
        isValid: false,
        message: 'Missing required address fields: street, city, state, and pincode are required',
      };
    }

    // Validate pincode format (6 digits for India)
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(address.pincode)) {
      return {
        isValid: false,
        message: 'Invalid pincode format. Pincode must be 6 digits',
      };
    }

    // Check if pincode is in any active service area
    const serviceArea = await ServiceAreaService.getServiceAreaByPincode(address.pincode);

    if (!serviceArea) {
      return {
        isValid: false,
        message: 'Service is not available in this area',
      };
    }

    // Validate city and state match
    const cityMatch = address.city.toLowerCase().trim() === serviceArea.city.toLowerCase().trim();
    const stateMatch = address.state.toLowerCase().trim() === serviceArea.state.toLowerCase().trim();

    if (!cityMatch || !stateMatch) {
      return {
        isValid: false,
        message: 'Address city or state does not match the service area',
      };
    }

    return {
      isValid: true,
      serviceArea: {
        id: serviceArea.id,
        name: serviceArea.name,
        city: serviceArea.city,
        state: serviceArea.state,
      },
      message: 'Address is within service area',
    };
  }

  /**
   * Validate if a pincode is serviceable
   */
  static async validatePincode(pincode: string): Promise<ValidationResult> {
    // Validate pincode format
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(pincode)) {
      return {
        isValid: false,
        message: 'Invalid pincode format. Pincode must be 6 digits',
      };
    }

    // Check if pincode is in any active service area
    const serviceArea = await ServiceAreaService.getServiceAreaByPincode(pincode);

    if (!serviceArea) {
      return {
        isValid: false,
        message: 'Service is not available for this pincode',
      };
    }

    return {
      isValid: true,
      serviceArea: {
        id: serviceArea.id,
        name: serviceArea.name,
        city: serviceArea.city,
        state: serviceArea.state,
      },
      message: 'Pincode is serviceable',
    };
  }

  /**
   * Get all serviceable pincodes
   */
  static async getServiceablePincodes(): Promise<string[]> {
    const serviceAreas = await ServiceAreaService.getServiceAreas('ACTIVE');
    const pincodes = serviceAreas.flatMap((area) => area.pincodes);
    return [...new Set(pincodes)]; // Remove duplicates
  }
}
