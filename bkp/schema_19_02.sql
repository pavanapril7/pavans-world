--
-- PostgreSQL database dump
--

-- Dumped from database version 17.2 (Postgres.app)
-- Dumped by pg_dump version 17.2 (Postgres.app)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: DayOfWeek; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DayOfWeek" AS ENUM (
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY'
);


--
-- Name: DeliveryPartnerStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DeliveryPartnerStatus" AS ENUM (
    'AVAILABLE',
    'BUSY',
    'OFFLINE'
);


--
-- Name: FulfillmentMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FulfillmentMethod" AS ENUM (
    'EAT_IN',
    'PICKUP',
    'DELIVERY'
);


--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationType" AS ENUM (
    'ORDER_PLACED',
    'ORDER_ACCEPTED',
    'ORDER_READY',
    'ORDER_PICKED_UP',
    'ORDER_DELIVERED',
    'ORDER_CANCELLED',
    'PAYMENT_SUCCESS',
    'PAYMENT_FAILED'
);


--
-- Name: OTPStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OTPStatus" AS ENUM (
    'PENDING',
    'VERIFIED',
    'EXPIRED',
    'INVALIDATED'
);


--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'PREPARING',
    'READY_FOR_PICKUP',
    'ASSIGNED_TO_DELIVERY',
    'PICKED_UP',
    'IN_TRANSIT',
    'DELIVERED',
    'CANCELLED',
    'REJECTED'
);


--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'CARD',
    'UPI',
    'NET_BANKING',
    'CASH_ON_DELIVERY'
);


--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'REFUNDED'
);


--
-- Name: ProductStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProductStatus" AS ENUM (
    'AVAILABLE',
    'OUT_OF_STOCK',
    'DISCONTINUED'
);


--
-- Name: ServiceAreaStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ServiceAreaStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserRole" AS ENUM (
    'CUSTOMER',
    'VENDOR',
    'DELIVERY_PARTNER',
    'SUPER_ADMIN'
);


--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED'
);


--
-- Name: VendorStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."VendorStatus" AS ENUM (
    'PENDING_APPROVAL',
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED'
);


--
-- Name: sync_address_location(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_address_location() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.location = NULL;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: sync_delivery_partner_location(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_delivery_partner_location() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW."currentLatitude" IS NOT NULL AND NEW."currentLongitude" IS NOT NULL THEN
    NEW."currentLocation" = ST_SetSRID(ST_MakePoint(NEW."currentLongitude", NEW."currentLatitude"), 4326)::geography;
  ELSE
    NEW."currentLocation" = NULL;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: sync_location_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_location_history() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END;
$$;


--
-- Name: sync_service_area_center(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_service_area_center() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.boundary IS NOT NULL THEN
    -- Calculate centroid and update center coordinates
    NEW."centerLatitude" = ST_Y(ST_Centroid(NEW.boundary::geometry));
    NEW."centerLongitude" = ST_X(ST_Centroid(NEW.boundary::geometry));
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: sync_vendor_location(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_vendor_location() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.location = NULL;
  END IF;
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Address; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Address" (
    id text NOT NULL,
    "userId" text NOT NULL,
    label text NOT NULL,
    street text NOT NULL,
    landmark text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    pincode text NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    latitude double precision,
    longitude double precision,
    "serviceAreaId" text
);


--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "userId" text NOT NULL,
    action text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    details jsonb,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Cart; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Cart" (
    id text NOT NULL,
    "customerId" text NOT NULL,
    "vendorId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: CartItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CartItem" (
    id text NOT NULL,
    "cartId" text NOT NULL,
    "productId" text NOT NULL,
    quantity integer NOT NULL
);


--
-- Name: DefaultMealSlot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DefaultMealSlot" (
    id text NOT NULL,
    name text NOT NULL,
    "startTime" text NOT NULL,
    "endTime" text NOT NULL,
    "cutoffTime" text NOT NULL,
    "timeWindowDuration" integer DEFAULT 60 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: DeliveryPartner; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DeliveryPartner" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "vehicleType" text,
    "vehicleNumber" text,
    status public."DeliveryPartnerStatus" DEFAULT 'OFFLINE'::public."DeliveryPartnerStatus" NOT NULL,
    "serviceAreaId" text,
    "totalDeliveries" integer DEFAULT 0 NOT NULL,
    rating numeric(3,2) DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "currentLatitude" double precision,
    "currentLongitude" double precision,
    "lastLocationUpdate" timestamp(3) without time zone
);


--
-- Name: LocationHistory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LocationHistory" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "deliveryPartnerId" text NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: MealSlot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MealSlot" (
    id text NOT NULL,
    "vendorId" text NOT NULL,
    name text NOT NULL,
    "startTime" text NOT NULL,
    "endTime" text NOT NULL,
    "cutoffTime" text NOT NULL,
    "timeWindowDuration" integer DEFAULT 60 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type public."NotificationType" NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: OTP; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OTP" (
    id text NOT NULL,
    "userId" text,
    phone text NOT NULL,
    code text NOT NULL,
    status public."OTPStatus" DEFAULT 'PENDING'::public."OTPStatus" NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: OperatingHours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OperatingHours" (
    id text NOT NULL,
    "vendorId" text NOT NULL,
    "dayOfWeek" public."DayOfWeek" NOT NULL,
    "openTime" text NOT NULL,
    "closeTime" text NOT NULL,
    "isClosed" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Order" (
    id text NOT NULL,
    "orderNumber" text NOT NULL,
    "customerId" text NOT NULL,
    "vendorId" text NOT NULL,
    "deliveryPartnerId" text,
    "deliveryAddressId" text NOT NULL,
    status public."OrderStatus" DEFAULT 'PENDING'::public."OrderStatus" NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    "deliveryFee" numeric(10,2) NOT NULL,
    tax numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "fulfillmentMethod" public."FulfillmentMethod" DEFAULT 'DELIVERY'::public."FulfillmentMethod" NOT NULL,
    "mealSlotId" text,
    "preferredDeliveryEnd" text,
    "preferredDeliveryStart" text
);


--
-- Name: OrderItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrderItem" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "productId" text NOT NULL,
    "productName" text NOT NULL,
    "productPrice" numeric(10,2) NOT NULL,
    quantity integer NOT NULL,
    subtotal numeric(10,2) NOT NULL
);


--
-- Name: OrderStatusHistory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrderStatusHistory" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    status public."OrderStatus" NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text
);


--
-- Name: Payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Payment" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    amount numeric(10,2) NOT NULL,
    method public."PaymentMethod" NOT NULL,
    status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    "gatewayTransactionId" text,
    "gatewayResponse" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    "vendorId" text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    price numeric(10,2) NOT NULL,
    "imageUrl" text,
    status public."ProductStatus" DEFAULT 'AVAILABLE'::public."ProductStatus" NOT NULL,
    category text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Refund; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Refund" (
    id text NOT NULL,
    "paymentId" text NOT NULL,
    amount numeric(10,2) NOT NULL,
    reason text NOT NULL,
    status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    "gatewayRefundId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ServiceArea; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ServiceArea" (
    id text NOT NULL,
    name text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    pincodes text[],
    status public."ServiceAreaStatus" DEFAULT 'ACTIVE'::public."ServiceAreaStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "centerLatitude" double precision,
    "centerLongitude" double precision,
    boundary public.geometry(Polygon,4326)
);


--
-- Name: Session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "userId" text NOT NULL,
    token text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    "passwordHash" text,
    phone text NOT NULL,
    role public."UserRole" NOT NULL,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL
);


--
-- Name: Vendor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Vendor" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "businessName" text NOT NULL,
    "categoryId" text NOT NULL,
    description text NOT NULL,
    rating numeric(3,2) DEFAULT 0 NOT NULL,
    "totalOrders" integer DEFAULT 0 NOT NULL,
    status public."VendorStatus" DEFAULT 'PENDING_APPROVAL'::public."VendorStatus" NOT NULL,
    "serviceAreaId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "imageUrl" text,
    latitude double precision,
    longitude double precision,
    "serviceRadiusKm" numeric(5,2) DEFAULT 10 NOT NULL
);


--
-- Name: VendorCategory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VendorCategory" (
    id text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    icon text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: VendorFulfillmentConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VendorFulfillmentConfig" (
    id text NOT NULL,
    "vendorId" text NOT NULL,
    "eatInEnabled" boolean DEFAULT false NOT NULL,
    "pickupEnabled" boolean DEFAULT true NOT NULL,
    "deliveryEnabled" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: Address Address_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Address"
    ADD CONSTRAINT "Address_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: CartItem CartItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CartItem"
    ADD CONSTRAINT "CartItem_pkey" PRIMARY KEY (id);


--
-- Name: Cart Cart_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Cart"
    ADD CONSTRAINT "Cart_pkey" PRIMARY KEY (id);


--
-- Name: DefaultMealSlot DefaultMealSlot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DefaultMealSlot"
    ADD CONSTRAINT "DefaultMealSlot_pkey" PRIMARY KEY (id);


--
-- Name: DeliveryPartner DeliveryPartner_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DeliveryPartner"
    ADD CONSTRAINT "DeliveryPartner_pkey" PRIMARY KEY (id);


--
-- Name: LocationHistory LocationHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LocationHistory"
    ADD CONSTRAINT "LocationHistory_pkey" PRIMARY KEY (id);


--
-- Name: MealSlot MealSlot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MealSlot"
    ADD CONSTRAINT "MealSlot_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: OTP OTP_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OTP"
    ADD CONSTRAINT "OTP_pkey" PRIMARY KEY (id);


--
-- Name: OperatingHours OperatingHours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OperatingHours"
    ADD CONSTRAINT "OperatingHours_pkey" PRIMARY KEY (id);


--
-- Name: OrderItem OrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_pkey" PRIMARY KEY (id);


--
-- Name: OrderStatusHistory OrderStatusHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderStatusHistory"
    ADD CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY (id);


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: Refund Refund_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Refund"
    ADD CONSTRAINT "Refund_pkey" PRIMARY KEY (id);


--
-- Name: ServiceArea ServiceArea_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ServiceArea"
    ADD CONSTRAINT "ServiceArea_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: VendorCategory VendorCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VendorCategory"
    ADD CONSTRAINT "VendorCategory_pkey" PRIMARY KEY (id);


--
-- Name: VendorFulfillmentConfig VendorFulfillmentConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VendorFulfillmentConfig"
    ADD CONSTRAINT "VendorFulfillmentConfig_pkey" PRIMARY KEY (id);


--
-- Name: Vendor Vendor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Vendor"
    ADD CONSTRAINT "Vendor_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Address_latitude_longitude_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Address_latitude_longitude_idx" ON public."Address" USING btree (latitude, longitude);


--
-- Name: Address_pincode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Address_pincode_idx" ON public."Address" USING btree (pincode);


--
-- Name: Address_serviceAreaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Address_serviceAreaId_idx" ON public."Address" USING btree ("serviceAreaId");


--
-- Name: Address_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Address_userId_idx" ON public."Address" USING btree ("userId");


--
-- Name: AuditLog_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_action_idx" ON public."AuditLog" USING btree (action);


--
-- Name: AuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt");


--
-- Name: AuditLog_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_entityId_idx" ON public."AuditLog" USING btree ("entityId");


--
-- Name: AuditLog_entityType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_entityType_idx" ON public."AuditLog" USING btree ("entityType");


--
-- Name: AuditLog_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_userId_idx" ON public."AuditLog" USING btree ("userId");


--
-- Name: CartItem_cartId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CartItem_cartId_idx" ON public."CartItem" USING btree ("cartId");


--
-- Name: CartItem_cartId_productId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CartItem_cartId_productId_key" ON public."CartItem" USING btree ("cartId", "productId");


--
-- Name: CartItem_productId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CartItem_productId_idx" ON public."CartItem" USING btree ("productId");


--
-- Name: Cart_customerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Cart_customerId_idx" ON public."Cart" USING btree ("customerId");


--
-- Name: Cart_customerId_vendorId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Cart_customerId_vendorId_key" ON public."Cart" USING btree ("customerId", "vendorId");


--
-- Name: Cart_vendorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Cart_vendorId_idx" ON public."Cart" USING btree ("vendorId");


--
-- Name: DeliveryPartner_currentLatitude_currentLongitude_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DeliveryPartner_currentLatitude_currentLongitude_idx" ON public."DeliveryPartner" USING btree ("currentLatitude", "currentLongitude");


--
-- Name: DeliveryPartner_serviceAreaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DeliveryPartner_serviceAreaId_idx" ON public."DeliveryPartner" USING btree ("serviceAreaId");


--
-- Name: DeliveryPartner_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DeliveryPartner_status_idx" ON public."DeliveryPartner" USING btree (status);


--
-- Name: DeliveryPartner_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DeliveryPartner_userId_idx" ON public."DeliveryPartner" USING btree ("userId");


--
-- Name: DeliveryPartner_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DeliveryPartner_userId_key" ON public."DeliveryPartner" USING btree ("userId");


--
-- Name: LocationHistory_deliveryPartnerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LocationHistory_deliveryPartnerId_idx" ON public."LocationHistory" USING btree ("deliveryPartnerId");


--
-- Name: LocationHistory_orderId_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LocationHistory_orderId_timestamp_idx" ON public."LocationHistory" USING btree ("orderId", "timestamp");


--
-- Name: MealSlot_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MealSlot_isActive_idx" ON public."MealSlot" USING btree ("isActive");


--
-- Name: MealSlot_vendorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MealSlot_vendorId_idx" ON public."MealSlot" USING btree ("vendorId");


--
-- Name: Notification_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_createdAt_idx" ON public."Notification" USING btree ("createdAt");


--
-- Name: Notification_isRead_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_isRead_idx" ON public."Notification" USING btree ("isRead");


--
-- Name: Notification_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_userId_idx" ON public."Notification" USING btree ("userId");


--
-- Name: OTP_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OTP_expiresAt_idx" ON public."OTP" USING btree ("expiresAt");


--
-- Name: OTP_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OTP_phone_idx" ON public."OTP" USING btree (phone);


--
-- Name: OTP_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OTP_status_idx" ON public."OTP" USING btree (status);


--
-- Name: OperatingHours_vendorId_dayOfWeek_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "OperatingHours_vendorId_dayOfWeek_key" ON public."OperatingHours" USING btree ("vendorId", "dayOfWeek");


--
-- Name: OperatingHours_vendorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OperatingHours_vendorId_idx" ON public."OperatingHours" USING btree ("vendorId");


--
-- Name: OrderItem_orderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderItem_orderId_idx" ON public."OrderItem" USING btree ("orderId");


--
-- Name: OrderItem_productId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderItem_productId_idx" ON public."OrderItem" USING btree ("productId");


--
-- Name: OrderStatusHistory_orderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderStatusHistory_orderId_idx" ON public."OrderStatusHistory" USING btree ("orderId");


--
-- Name: OrderStatusHistory_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderStatusHistory_timestamp_idx" ON public."OrderStatusHistory" USING btree ("timestamp");


--
-- Name: Order_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_createdAt_idx" ON public."Order" USING btree ("createdAt");


--
-- Name: Order_customerId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_customerId_createdAt_idx" ON public."Order" USING btree ("customerId", "createdAt");


--
-- Name: Order_customerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_customerId_idx" ON public."Order" USING btree ("customerId");


--
-- Name: Order_deliveryPartnerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_deliveryPartnerId_idx" ON public."Order" USING btree ("deliveryPartnerId");


--
-- Name: Order_fulfillmentMethod_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_fulfillmentMethod_idx" ON public."Order" USING btree ("fulfillmentMethod");


--
-- Name: Order_mealSlotId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_mealSlotId_idx" ON public."Order" USING btree ("mealSlotId");


--
-- Name: Order_orderNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_orderNumber_idx" ON public."Order" USING btree ("orderNumber");


--
-- Name: Order_orderNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Order_orderNumber_key" ON public."Order" USING btree ("orderNumber");


--
-- Name: Order_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_status_createdAt_idx" ON public."Order" USING btree (status, "createdAt");


--
-- Name: Order_status_customerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_status_customerId_idx" ON public."Order" USING btree (status, "customerId");


--
-- Name: Order_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_status_idx" ON public."Order" USING btree (status);


--
-- Name: Order_status_vendorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_status_vendorId_idx" ON public."Order" USING btree (status, "vendorId");


--
-- Name: Order_vendorId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_vendorId_createdAt_idx" ON public."Order" USING btree ("vendorId", "createdAt");


--
-- Name: Order_vendorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_vendorId_idx" ON public."Order" USING btree ("vendorId");


--
-- Name: Payment_orderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Payment_orderId_idx" ON public."Payment" USING btree ("orderId");


--
-- Name: Payment_orderId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Payment_orderId_key" ON public."Payment" USING btree ("orderId");


--
-- Name: Payment_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Payment_status_idx" ON public."Payment" USING btree (status);


--
-- Name: Product_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_status_idx" ON public."Product" USING btree (status);


--
-- Name: Product_vendorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_vendorId_idx" ON public."Product" USING btree ("vendorId");


--
-- Name: Refund_paymentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Refund_paymentId_idx" ON public."Refund" USING btree ("paymentId");


--
-- Name: Refund_paymentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Refund_paymentId_key" ON public."Refund" USING btree ("paymentId");


--
-- Name: ServiceArea_centerLatitude_centerLongitude_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ServiceArea_centerLatitude_centerLongitude_idx" ON public."ServiceArea" USING btree ("centerLatitude", "centerLongitude");


--
-- Name: ServiceArea_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ServiceArea_status_idx" ON public."ServiceArea" USING btree (status);


--
-- Name: Session_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Session_expiresAt_idx" ON public."Session" USING btree ("expiresAt");


--
-- Name: Session_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Session_token_idx" ON public."Session" USING btree (token);


--
-- Name: Session_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Session_token_key" ON public."Session" USING btree (token);


--
-- Name: Session_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Session_userId_idx" ON public."Session" USING btree ("userId");


--
-- Name: User_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_email_idx" ON public."User" USING btree (email);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_phone_idx" ON public."User" USING btree (phone);


--
-- Name: User_phone_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_phone_key" ON public."User" USING btree (phone);


--
-- Name: User_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_role_idx" ON public."User" USING btree (role);


--
-- Name: User_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_status_idx" ON public."User" USING btree (status);


--
-- Name: VendorCategory_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VendorCategory_name_key" ON public."VendorCategory" USING btree (name);


--
-- Name: VendorFulfillmentConfig_vendorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "VendorFulfillmentConfig_vendorId_idx" ON public."VendorFulfillmentConfig" USING btree ("vendorId");


--
-- Name: VendorFulfillmentConfig_vendorId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VendorFulfillmentConfig_vendorId_key" ON public."VendorFulfillmentConfig" USING btree ("vendorId");


--
-- Name: Vendor_categoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Vendor_categoryId_idx" ON public."Vendor" USING btree ("categoryId");


--
-- Name: Vendor_latitude_longitude_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Vendor_latitude_longitude_idx" ON public."Vendor" USING btree (latitude, longitude);


--
-- Name: Vendor_serviceAreaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Vendor_serviceAreaId_idx" ON public."Vendor" USING btree ("serviceAreaId");


--
-- Name: Vendor_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Vendor_status_idx" ON public."Vendor" USING btree (status);


--
-- Name: Vendor_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Vendor_userId_idx" ON public."Vendor" USING btree ("userId");


--
-- Name: Vendor_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Vendor_userId_key" ON public."Vendor" USING btree ("userId");


--
-- Name: idx_service_area_boundary; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_area_boundary ON public."ServiceArea" USING gist (boundary);


--
-- Name: Address address_location_sync; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER address_location_sync BEFORE INSERT OR UPDATE ON public."Address" FOR EACH ROW EXECUTE FUNCTION public.sync_address_location();


--
-- Name: DeliveryPartner delivery_partner_location_sync; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delivery_partner_location_sync BEFORE INSERT OR UPDATE ON public."DeliveryPartner" FOR EACH ROW EXECUTE FUNCTION public.sync_delivery_partner_location();


--
-- Name: LocationHistory location_history_sync; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER location_history_sync BEFORE INSERT ON public."LocationHistory" FOR EACH ROW EXECUTE FUNCTION public.sync_location_history();


--
-- Name: ServiceArea service_area_center_sync; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER service_area_center_sync BEFORE INSERT OR UPDATE OF boundary ON public."ServiceArea" FOR EACH ROW EXECUTE FUNCTION public.sync_service_area_center();


--
-- Name: Vendor vendor_location_sync; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER vendor_location_sync BEFORE INSERT OR UPDATE ON public."Vendor" FOR EACH ROW EXECUTE FUNCTION public.sync_vendor_location();


--
-- Name: Address Address_serviceAreaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Address"
    ADD CONSTRAINT "Address_serviceAreaId_fkey" FOREIGN KEY ("serviceAreaId") REFERENCES public."ServiceArea"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Address Address_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Address"
    ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CartItem CartItem_cartId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CartItem"
    ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES public."Cart"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CartItem CartItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CartItem"
    ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Cart Cart_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Cart"
    ADD CONSTRAINT "Cart_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Cart Cart_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Cart"
    ADD CONSTRAINT "Cart_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public."Vendor"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DeliveryPartner DeliveryPartner_serviceAreaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DeliveryPartner"
    ADD CONSTRAINT "DeliveryPartner_serviceAreaId_fkey" FOREIGN KEY ("serviceAreaId") REFERENCES public."ServiceArea"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DeliveryPartner DeliveryPartner_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DeliveryPartner"
    ADD CONSTRAINT "DeliveryPartner_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LocationHistory LocationHistory_deliveryPartnerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LocationHistory"
    ADD CONSTRAINT "LocationHistory_deliveryPartnerId_fkey" FOREIGN KEY ("deliveryPartnerId") REFERENCES public."DeliveryPartner"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LocationHistory LocationHistory_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LocationHistory"
    ADD CONSTRAINT "LocationHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MealSlot MealSlot_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MealSlot"
    ADD CONSTRAINT "MealSlot_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public."Vendor"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OTP OTP_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OTP"
    ADD CONSTRAINT "OTP_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OperatingHours OperatingHours_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OperatingHours"
    ADD CONSTRAINT "OperatingHours_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public."Vendor"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrderItem OrderItem_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrderItem OrderItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OrderStatusHistory OrderStatusHistory_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderStatusHistory"
    ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Order Order_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Order Order_deliveryAddressId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_deliveryAddressId_fkey" FOREIGN KEY ("deliveryAddressId") REFERENCES public."Address"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Order Order_deliveryPartnerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_deliveryPartnerId_fkey" FOREIGN KEY ("deliveryPartnerId") REFERENCES public."DeliveryPartner"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_mealSlotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_mealSlotId_fkey" FOREIGN KEY ("mealSlotId") REFERENCES public."MealSlot"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public."Vendor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payment Payment_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Product Product_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public."Vendor"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Refund Refund_paymentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Refund"
    ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES public."Payment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: VendorFulfillmentConfig VendorFulfillmentConfig_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VendorFulfillmentConfig"
    ADD CONSTRAINT "VendorFulfillmentConfig_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public."Vendor"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Vendor Vendor_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Vendor"
    ADD CONSTRAINT "Vendor_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."VendorCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Vendor Vendor_serviceAreaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Vendor"
    ADD CONSTRAINT "Vendor_serviceAreaId_fkey" FOREIGN KEY ("serviceAreaId") REFERENCES public."ServiceArea"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Vendor Vendor_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Vendor"
    ADD CONSTRAINT "Vendor_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

