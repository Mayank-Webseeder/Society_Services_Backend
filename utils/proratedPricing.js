/**
 * Calculate prorated price for mid-year service activation
 * @param {Number} annualPrice - Full year service price
 * @param {Date} startDate - Service start date (current date)
 * @param {Date} yearEndDate - Year end date (Dec 31 of current year)
 * @returns {Number} Prorated price for remaining months
 */
exports.calculateProratedPrice = (annualPrice, startDate, yearEndDate) => {
  if (!annualPrice || annualPrice < 0) return 0;

  const start = new Date(startDate);
  const end = new Date(yearEndDate);

  // Calculate total days in the year
  const yearStart = new Date(start.getFullYear(), 0, 1);
  const yearEnd = new Date(start.getFullYear(), 11, 31);
  const totalDaysInYear = Math.ceil((yearEnd - yearStart) / (1000 * 60 * 60 * 24)) + 1;

  // Calculate remaining days from start date to year end
  const remainingDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  // Calculate prorated price
  const proratedPrice = Math.round((remainingDays / totalDaysInYear) * annualPrice);

  return Math.max(proratedPrice, 100); // Minimum 100 paise (₹1)
};

/**
 * Calculate prorated price based on remaining months
 * @param {Number} annualPrice - Full year service price
 * @param {Date} startDate - Service start date
 * @returns {Object} Contains prorated price and month details
 */
exports.calculateProratedPriceByMonth = (annualPrice, startDate) => {
  if (!annualPrice || annualPrice < 0) return { price: 0, months: 0 };

  const start = new Date(startDate);
  const currentYear = start.getFullYear();
  const yearEnd = new Date(currentYear, 11, 31); // December 31

  // Calculate remaining months
  const currentMonth = start.getMonth();
  const remainingMonths = 12 - currentMonth;

  // Calculate prorated price (assuming uniform distribution across months)
  const monthlyPrice = annualPrice / 12;
  const proratedPrice = Math.round(monthlyPrice * remainingMonths);

  return {
    price: Math.max(proratedPrice, 100), // Minimum 100 paise
    months: remainingMonths,
    yearEndDate: yearEnd,
    monthlyRate: Math.round(monthlyPrice),
  };
};

/**
 * Get year end date for current date
 * @param {Date} date - Reference date
 * @returns {Date} December 31 of the same year
 */
exports.getYearEndDate = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), 11, 31);
};

/**
 * Get remaining days in the year
 * @param {Date} startDate - Reference date
 * @returns {Number} Number of remaining days
 */
exports.getRemainingDaysInYear = (startDate) => {
  const start = new Date(startDate);
  const yearEnd = new Date(start.getFullYear(), 11, 31);
  return Math.ceil((yearEnd - start) / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * Calculate remaining months in the year
 * @param {Date} startDate - Reference date
 * @returns {Number} Number of remaining months
 */
exports.getRemainingMonths = (startDate) => {
  const start = new Date(startDate);
  return 12 - start.getMonth();
};
