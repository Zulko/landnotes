<script>
  import { constrainedDate } from "../data/date_utils";
  // Define a date object to hold the values
  let { date = $bindable({ year: 1810, month: 3, day: "all" }) } = $props();

  // Add an array of month abbreviations
  const monthAbbreviations = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Optional: you can also export individual props if needed
  // but they should be bound to date properties

  // const firstYearRequiringMonth = 1500;
  // const firstYearRequiringDay = 1920;
  const firstYearRequiringMonth = 3000;
  const firstYearRequiringDay = 3000;

  function getDaysInMonth(year, month) {
    return new Date(year < 0 ? year + 1 : year, month, 0).getDate();
  }

  function updateDate(field, value) {
    return constrainedDate({ ...date, [field]: value });
  }
</script>

<div class="date-picker">
  {#if date.month !== "all"}
    <select
      value={date.day}
      onchange={(e) =>
        updateDate(
          "day",
          e.target.value === "all" ? "all" : parseInt(e.target.value)
        )}
      aria-label="Day"
      style="width: 60px;"
    >
      {#if date.year < firstYearRequiringDay}
        <option value="all">All</option>
      {/if}
      {#each Array.from({ length: getDaysInMonth(date.year, date.month) }, (_, i) => 1 + i) as day}
        <option value={day}>{day}</option>
      {/each}
    </select>
  {/if}
  <select
    value={date.month}
    onchange={(e) =>
      updateDate(
        "month",
        e.target.value === "all" ? "all" : parseInt(e.target.value)
      )}
  >
    {#if date.year < firstYearRequiringMonth}
      <option value="all">All year</option>
    {/if}
    {#each Array.from({ length: 12 }, (_, i) => 1 + i) as month}
      <option value={month}>{monthAbbreviations[month - 1]}</option>
    {/each}
  </select>
  <input
    type="number"
    value={date.year}
    onchange={(e) => updateDate("year", parseInt(e.target.value))}
    min="-10000"
    max="2000"
    placeholder="Year"
    aria-label="Year"
    style="width: 60px;"
  />
</div>

<style>
  .date-picker {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family:
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Roboto,
      sans-serif;
    flex-wrap: nowrap;
    padding: 8px;
    width: fit-content;
    margin: 0 auto;
  }

  input,
  select {
    margin-left: 4px;
    padding: 6px 4px 6px 4px;
    border: 1px solid #e0e4e8;
    border-radius: 6px;
    background-color: #fff;
    color: #333;
    font-size: 0.9rem;
    transition: all 0.2s ease;
    outline: none;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    text-align: center;
  }

  input:focus {
    border-color: #4f86ed;
    box-shadow: 0 0 0 2px rgba(79, 134, 237, 0.2);
  }

  /* Style the spinner buttons to be always visible */
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    opacity: 1;
    height: 1.5em;
    width: 1.2em;
    position: relative;
    right: -2px;
  }
</style>
