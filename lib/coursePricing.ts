import type { CoursePricing } from "@/types/course";

const DISCOUNT_TYPE = {
  PERCENT: "percent",
  FIXED: "fixed",
} as const;

const MIN_PAID_COURSE_PRICE = 5;

export type PublicPriceDisplay = {
  isFree: boolean;
  primaryLabel: string;
  compareAt: number | null;
  savings: number | null;
  promoLabel: string | null;
  expirationLabel: string | null;
};

const roundCurrency = (amount: number) => Math.round(amount * 100) / 100;

const isDiscountExpired = (
  discount?: CoursePricing["discount"],
  now = new Date(),
) => {
  if (!discount?.enabled || !discount.endsAt) return false;
  const endsAt = new Date(discount.endsAt);
  return !Number.isNaN(endsAt.getTime()) && endsAt.getTime() <= now.getTime();
};

const isFreeOfferExpired = (pricing?: CoursePricing, now = new Date()) => {
  if (!pricing?.isFree || !pricing.freeEndsAt) return false;
  const endsAt = new Date(pricing.freeEndsAt);
  return !Number.isNaN(endsAt.getTime()) && endsAt.getTime() <= now.getTime();
};

const getEffectiveDiscount = (
  discount?: CoursePricing["discount"],
  now = new Date(),
) => {
  if (!discount?.enabled) {
    return {
      enabled: false,
      type: discount?.type || DISCOUNT_TYPE.PERCENT,
      value: 0,
      endsAt: discount?.endsAt || null,
    };
  }

  if (isDiscountExpired(discount, now)) {
    return {
      enabled: false,
      type: discount.type,
      value: discount.value,
      endsAt: discount.endsAt,
    };
  }

  return discount;
};

export const computeSalePrice = (
  listPrice: number,
  discount?: CoursePricing["discount"],
) => {
  const price = Number(listPrice) || 0;
  const effective = getEffectiveDiscount(discount);
  if (!effective?.enabled || price <= 0) return price;

  const value = Number(effective.value) || 0;
  if (value <= 0) return price;

  if (effective.type === DISCOUNT_TYPE.FIXED) {
    return roundCurrency(Math.max(0, price - value));
  }

  const percent = Math.min(100, Math.max(0, value));
  return roundCurrency(price * (1 - percent / 100));
};

export const getCourseSalePrice = (
  pricing?: CoursePricing,
  now = new Date(),
) => {
  if (!pricing) return 0;
  if (pricing.isFree) {
    if (isFreeOfferExpired(pricing, now)) {
      const listPrice = Number(pricing.price) || 0;
      return listPrice > 0 ? listPrice : 0;
    }
    return 0;
  }
  return computeSalePrice(pricing.price, pricing.discount);
};

export const hasCourseDiscount = (
  pricing?: CoursePricing,
  now = new Date(),
) => {
  if (!pricing || pricing.isFree) return false;
  const listPrice = Number(pricing.price) || 0;
  const salePrice = getCourseSalePrice(pricing, now);
  return salePrice > 0 && salePrice < listPrice;
};

export const hasFreeCompareAt = (pricing?: CoursePricing, now = new Date()) => {
  if (!pricing?.isFree || isFreeOfferExpired(pricing, now)) return false;
  return Number(pricing.price) > 0;
};

export const formatUsd = (amount: number) => `USD ${Number(amount).toFixed(2)}`;

const formatDiscountEndsAt = (value: string | Date) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export const getDiscountExpirationInfo = (
  pricing?: CoursePricing,
  now = new Date(),
) => {
  if (!pricing?.discount?.enabled || !pricing.discount.endsAt) return null;
  if (isDiscountExpired(pricing.discount, now)) return null;

  const endsAt = new Date(pricing.discount.endsAt);
  if (Number.isNaN(endsAt.getTime())) return null;

  const msLeft = endsAt.getTime() - now.getTime();
  return {
    endsAt,
    endsAtLabel: formatDiscountEndsAt(endsAt),
    isEndingSoon: msLeft > 0 && msLeft <= 48 * 60 * 60 * 1000,
  };
};

export const getFreeOfferExpirationInfo = (
  pricing?: CoursePricing,
  now = new Date(),
) => {
  if (!pricing?.isFree || !pricing.freeEndsAt) return null;
  if (isFreeOfferExpired(pricing, now)) return null;

  const endsAt = new Date(pricing.freeEndsAt);
  if (Number.isNaN(endsAt.getTime())) return null;

  const msLeft = endsAt.getTime() - now.getTime();
  return {
    endsAt,
    endsAtLabel: formatDiscountEndsAt(endsAt),
    isEndingSoon: msLeft > 0 && msLeft <= 48 * 60 * 60 * 1000,
  };
};

export const getDiscountSummary = (
  pricing?: CoursePricing,
  now = new Date(),
) => {
  if (!pricing || !hasCourseDiscount(pricing, now)) return null;

  const listPrice = Number(pricing.price) || 0;
  const salePrice = getCourseSalePrice(pricing, now);
  const savings = roundCurrency(listPrice - salePrice);
  const expiration = getDiscountExpirationInfo(pricing, now);

  if (pricing.discount?.type === DISCOUNT_TYPE.PERCENT) {
    return {
      listPrice,
      salePrice,
      savings,
      label: `${pricing.discount.value}% off`,
      expiration,
    };
  }

  return {
    listPrice,
    salePrice,
    savings,
    label: `${formatUsd(savings)} off`,
    expiration,
  };
};

export const getPublicPriceDisplay = (
  pricing?: CoursePricing,
  now = new Date(),
): PublicPriceDisplay => {
  if (!pricing) {
    return {
      isFree: true,
      primaryLabel: "Free",
      compareAt: null,
      savings: null,
      promoLabel: null,
      expirationLabel: null,
    };
  }

  if (pricing.isFree) {
    if (isFreeOfferExpired(pricing, now)) {
      const listPrice = Number(pricing.price) || 0;
      if (listPrice > 0) {
        return {
          isFree: false,
          primaryLabel: formatUsd(listPrice),
          compareAt: null,
          savings: null,
          promoLabel: null,
          expirationLabel: null,
        };
      }
    }

    const compareAt =
      Number(pricing.price) > 0 ? roundCurrency(Number(pricing.price)) : null;
    const freeExpiration = getFreeOfferExpirationInfo(pricing, now);
    return {
      isFree: true,
      primaryLabel: "Free",
      compareAt,
      savings: compareAt,
      promoLabel: compareAt ? "100% off" : null,
      expirationLabel: freeExpiration
        ? `Free offer ends ${freeExpiration.endsAtLabel}`
        : null,
    };
  }

  const discount = getDiscountSummary(pricing, now);
  if (discount) {
    return {
      isFree: false,
      primaryLabel: formatUsd(discount.salePrice),
      compareAt: discount.listPrice,
      savings: discount.savings,
      promoLabel: discount.label,
      expirationLabel: discount.expiration
        ? `Offer ends ${discount.expiration.endsAtLabel}`
        : null,
    };
  }

  return {
    isFree: false,
    primaryLabel: formatUsd(pricing.price),
    compareAt: null,
    savings: null,
    promoLabel: null,
    expirationLabel: null,
  };
};
