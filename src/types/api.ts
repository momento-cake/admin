/**
 * API request and response type definitions.
 *
 * @remarks
 * This module defines the contracts for API endpoints including request bodies,
 * response formats, query parameters, and error responses. All API routes should
 * use these types for consistency and type safety.
 */

import { Ingredient, Supplier, PriceHistoryEntry } from './ingredient';
import { Recipe, CostBreakdown } from './recipe';
import { UserModel, UserInvitation } from './index';

// ============================================================================
// Standard API Response Wrapper
// ============================================================================

/**
 * Standard successful API response wrapper.
 *
 * @template T - The type of data being returned
 *
 * @remarks
 * All successful API responses should use this format for consistency.
 * The data field contains the actual response payload.
 *
 * @example
 * ```typescript
 * const response: ApiResponse<Ingredient> = {
 *   success: true,
 *   data: ingredient,
 *   message: 'Ingredient retrieved successfully'
 * };
 * ```
 */
export interface ApiResponse<T> {
  /** Indicates the request was successful */
  success: true;

  /** The response data payload */
  data: T;

  /** Human-readable success message (optional) */
  message?: string;

  /** Additional metadata about the response (optional) */
  metadata?: Record<string, unknown>;
}

/**
 * Standard API error response.
 *
 * @remarks
 * All error responses should use this format for consistency and
 * error handling at the client level.
 *
 * @example
 * ```typescript
 * const error: ApiErrorResponse = {
 *   success: false,
 *   error: {
 *     code: 'VALIDATION_ERROR',
 *     message: 'Invalid ingredient data',
 *     details: [
 *       { field: 'name', message: 'Name is required' }
 *     ]
 *   }
 * };
 * ```
 */
export interface ApiErrorResponse {
  /** Indicates the request failed */
  success: false;

  /** Error information */
  error: {
    /** Machine-readable error code */
    code: string;

    /** Human-readable error message */
    message: string;

    /** Detailed error information (e.g., validation errors) */
    details?: Array<{
      field?: string;
      message: string;
    }>;

    /** Stack trace (development only) */
    stack?: string;
  };

  /** HTTP status code */
  statusCode: number;
}

/**
 * Union type for API responses (success or error)
 */
export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

// ============================================================================
// Pagination Types
// ============================================================================

/**
 * Pagination query parameters.
 *
 * @remarks
 * Used for endpoints that return paginated lists.
 * Default page is 1, default limit is 50.
 */
export interface PaginationQuery {
  /** Page number (1-indexed) */
  page?: number;

  /** Number of items per page (max 100) */
  limit?: number;

  /** Field to sort by */
  sortBy?: string;

  /** Sort direction (asc or desc) */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response metadata.
 *
 * @remarks
 * Included in paginated list responses to provide navigation info.
 */
export interface PaginationMeta {
  /** Current page number */
  page: number;

  /** Items per page */
  limit: number;

  /** Total number of items */
  total: number;

  /** Total number of pages */
  pages: number;

  /** Whether there is a next page */
  hasNextPage: boolean;

  /** Whether there is a previous page */
  hasPreviousPage: boolean;
}

/**
 * Paginated list response.
 *
 * @template T - Type of items in the list
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  /** Pagination metadata */
  pagination: PaginationMeta;
}

// ============================================================================
// Ingredient API Types
// ============================================================================

/**
 * Request body for creating an ingredient
 */
export interface CreateIngredientRequest {
  name: string;
  description?: string;
  unit: string;
  measurementValue: number;
  brand?: string;
  currentPrice: number;
  supplierId?: string;
  minStock: number;
  currentStock: number;
  category: string;
  allergens: string[];
}

/**
 * Request body for updating an ingredient
 */
export interface UpdateIngredientRequest extends Partial<CreateIngredientRequest> {
  id: string;
}

/**
 * Request body for creating a supplier
 */
export interface CreateSupplierRequest {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  cep?: string;
  estado?: string;
  cidade?: string;
  bairro?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  address?: string;
  cpfCnpj?: string;
  inscricaoEstadual?: string;
  rating: number;
  categories: string[];
}

/**
 * Request body for updating a supplier
 */
export interface UpdateSupplierRequest extends Partial<CreateSupplierRequest> {
  id: string;
}

/**
 * Request body for recording a price history entry
 */
export interface CreatePriceHistoryRequest {
  ingredientId: string;
  price: number;
  supplierId: string;
  quantity: number;
  notes?: string;
}

/**
 * Response type for ingredient list endpoint
 */
export type IngredientsListResponse = PaginatedResponse<Ingredient>;

/**
 * Response type for ingredient detail endpoint
 */
export type IngredientDetailResponse = ApiResponse<Ingredient>;

/**
 * Response type for suppliers list endpoint
 */
export type SuppliersListResponse = PaginatedResponse<Supplier>;

/**
 * Response type for supplier detail endpoint
 */
export type SupplierDetailResponse = ApiResponse<Supplier>;

/**
 * Response type for price history endpoint
 */
export type PriceHistoryResponse = PaginatedResponse<PriceHistoryEntry>;

// ============================================================================
// Recipe API Types
// ============================================================================

/**
 * Request body for creating a recipe
 */
export interface CreateRecipeRequest {
  name: string;
  description?: string;
  category: string;
  generatedAmount: number;
  generatedUnit: string;
  servings: number;
  difficulty: string;
  recipeItems: Array<{
    type: 'ingredient' | 'recipe';
    ingredientId?: string;
    subRecipeId?: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
  instructions: Array<{
    stepNumber: number;
    instruction: string;
    timeMinutes: number;
    notes?: string;
  }>;
  notes?: string;
}

/**
 * Request body for updating a recipe
 */
export interface UpdateRecipeRequest extends Partial<CreateRecipeRequest> {
  id: string;
}

/**
 * Request body for calculating recipe cost
 */
export interface CalculateCostRequest {
  recipeId: string;
  laborHourRate?: number;
  margin?: number;
}

/**
 * Response type for recipes list endpoint
 */
export type RecipesListResponse = PaginatedResponse<Recipe>;

/**
 * Response type for recipe detail endpoint
 */
export type RecipeDetailResponse = ApiResponse<Recipe>;

/**
 * Response type for cost calculation endpoint
 */
export type CostCalculationResponse = ApiResponse<CostBreakdown>;

// ============================================================================
// User & Authentication API Types
// ============================================================================

/**
 * Request body for user login
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Response type for login endpoint
 */
export type LoginResponse = ApiResponse<{
  user: UserModel;
  token: string;
  expiresIn: number;
}>;

/**
 * Request body for user registration
 */
export interface RegisterRequest {
  invitationToken: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  department?: string;
  acceptsTerms: boolean;
}

/**
 * Response type for registration endpoint
 */
export type RegisterResponse = ApiResponse<UserModel>;

/**
 * Request body for inviting a new user
 */
export interface CreateInvitationRequest {
  email: string;
  name: string;
  role: 'admin' | 'atendente';
  expiresIn?: number;
}

/**
 * Response type for invitation creation
 */
export type CreateInvitationResponse = ApiResponse<UserInvitation>;

/**
 * Response type for invitations list
 */
export type InvitationsListResponse = PaginatedResponse<UserInvitation>;

/**
 * Request body for updating user profile
 */
export interface UpdateProfileRequest {
  displayName?: string;
  photoURL?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  bio?: string;
}

/**
 * Response type for profile update
 */
export type UpdateProfileResponse = ApiResponse<UserModel>;

/**
 * Request body for password change
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Response type for password change
 */
export type ChangePasswordResponse = ApiResponse<{ message: string }>;

// ============================================================================
// Error Response Types
// ============================================================================

/**
 * Validation error response
 *
 * @remarks
 * Returned when request validation fails (400)
 */
export interface ValidationErrorResponse extends ApiErrorResponse {
  error: ApiErrorResponse['error'] & {
    code: 'VALIDATION_ERROR';
  };
  statusCode: 400;
}

/**
 * Unauthorized error response
 *
 * @remarks
 * Returned when authentication fails (401)
 */
export interface UnauthorizedErrorResponse extends ApiErrorResponse {
  error: ApiErrorResponse['error'] & {
    code: 'UNAUTHORIZED';
  };
  statusCode: 401;
}

/**
 * Forbidden error response
 *
 * @remarks
 * Returned when user lacks required permissions (403)
 */
export interface ForbiddenErrorResponse extends ApiErrorResponse {
  error: ApiErrorResponse['error'] & {
    code: 'FORBIDDEN';
  };
  statusCode: 403;
}

/**
 * Not found error response
 *
 * @remarks
 * Returned when resource is not found (404)
 */
export interface NotFoundErrorResponse extends ApiErrorResponse {
  error: ApiErrorResponse['error'] & {
    code: 'NOT_FOUND';
  };
  statusCode: 404;
}

/**
 * Internal server error response
 *
 * @remarks
 * Returned for unhandled server errors (500)
 */
export interface InternalServerErrorResponse extends ApiErrorResponse {
  error: ApiErrorResponse['error'] & {
    code: 'INTERNAL_SERVER_ERROR';
  };
  statusCode: 500;
}

// ============================================================================
// Common HTTP Status Codes
// ============================================================================

/**
 * HTTP status codes used by the API
 */
export enum HttpStatusCode {
  // 2xx Success
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,

  // 4xx Client Error
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,

  // 5xx Server Error
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

// ============================================================================
// API Error Codes
// ============================================================================

/**
 * Standard error codes used across the API
 */
export enum ApiErrorCode {
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_FIELD = 'MISSING_FIELD',

  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Resource Errors
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  ALREADY_EXISTS = 'ALREADY_EXISTS',

  // Business Logic
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
  INVALID_OPERATION = 'INVALID_OPERATION',

  // Server Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

// ============================================================================
// Utility Type for Response Handling
// ============================================================================

/**
 * Helper type for extracting data type from API response
 *
 * @example
 * ```typescript
 * type IngredientData = ExtractApiData<IngredientsListResponse>;
 * // IngredientData = Ingredient[]
 * ```
 */
export type ExtractApiData<T> = T extends ApiResponse<infer U> ? U : never;

/**
 * Helper type for checking if response is an error
 *
 * @example
 * ```typescript
 * if ('error' in response) {
 *   // response is ApiErrorResponse
 * }
 * ```
 */
export type IsErrorResponse<T> = T extends ApiErrorResponse ? true : false;
