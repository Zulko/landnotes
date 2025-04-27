/**
 * Configuration for date validation constraints
 * Defines thresholds for when month and day values become required
 */
export const dateConstraints = {
  firstYearRequiringMonth: 3000,
  firstYearRequiringDay: 3000,
};

/**
 * Calculates the number of days in a specific month and year
 *
 * @param {number} year - The year (handles both positive and negative years)
 * @param {number} month - The month (1-12)
 * @returns {number} The number of days in the specified month
 */
function getDaysInMonth(year, month) {
  return new Date(year < 0 ? year + 1 : year, month, 0).getDate();
}

/**
 * Ensures a date object conforms to defined constraints.
 * - Enforces month requirements for years beyond threshold
 * - Enforces day requirements for years beyond threshold
 * - Ensures day values are within valid range for the month/year
 *
 * @param {Object} date - Date object with year, month, and day properties
 * @param {number} date.year - Year value
 * @param {number|string} date.month - Month value (1-12 or "all")
 * @param {number|string} date.day - Day value (1-31 or "all")
 * @returns {Object} The constrained date object
 */
export function constrainedDate(date) {
  // Enforce month requirement for years beyond threshold
  const newDate = { ...date };
  if (
    date.year > dateConstraints.firstYearRequiringMonth &&
    date.month === "all"
  ) {
    newDate.month = 1;
  }

  // Enforce day requirement for years beyond threshold
  if (date.year > dateConstraints.firstYearRequiringDay && date.day === "all") {
    newDate.day = 1;
  }

  // Ensure day is within valid range for the month
  if (date.day !== "all" && date.month !== "all") {
    const daysInMonth = getDaysInMonth(date.year, date.month);
    newDate.day = Math.min(Math.max(date.day, 1), daysInMonth);
  }

  return newDate;
}

export function parseEventDate(date) {
  const isApproximate = date.includes("(~)");
  const [year, month, day] = date.replace(" (~)", "").split("/").map(Number);
  return { year, month, day, isApproximate };
}

export function daysBetweenTwoDates(date1, date2) {
  const yearGap = 365 * (date1.year - date2.year);
  const monthGap = (date1.month - date2.month) * 30;
  const dayGap = date1.day - date2.day;
  return yearGap + monthGap + dayGap;
}

export function isAfter(date1, date2) {
  return (
    date1.year > date2.year ||
    (date1.year === date2.year &&
      (date1.month > date2.month ||
        (date1.month === date2.month &&
          (date1.day > date2.day || date1.day === date2.day))))
  );
}

export function dateToUrlString(date) {
  if (!date) {
    return null;
  }
  if (date.month === "all") {
    return `${date.year}`;
  } else if (date.day === "all") {
    return `${date.year}--${date.month}`;
  } else {
    return `${date.year}--${date.month}--${date.day}`;
  }
}

export function parseUrlDate(dateString) {
  if (!dateString) {
    return null;
  }
  let date = null;
  const components = dateString.split("--").map(parseInt);
  if (components.length === 1) {
    let [year] = components;
    date = { year, month: "all", day: "all" };
  } else if (components.length === 2) {
    let [year, month] = components;
    date = { year, month, day: "all" };
  } else if (components.length === 3) {
    let [year, month, day] = components;
    date = { year, month, day };
  }
  return constrainedDate(date);
}
