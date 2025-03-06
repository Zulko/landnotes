<script>
  import { onMount } from 'svelte';
  import Map from './lib/Map.svelte';
  // Initial sample markers (will be replaced with data from DuckDB)
  let markers = [
    { lat: 51.505, lng: -0.09, popup: "London" },
    { lat: 48.8566, lng: 2.3522, popup: "Paris" },
    { lat: 40.7128, lng: -74.0060, popup: "New York" },
  ];

  let dbStatus = 'not started';
  let rowCount = 0;

  // Handle status updates
  function handleStatusChange(status, count) {
    dbStatus = status;
    console.log(`DuckDB status: ${status}`);
    
    if (status === 'complete') {
      rowCount = count;
      console.log(`Database loaded with ${count} rows`);
      loadMarkersFromDB();
    }
  }

  // Load markers from DuckDB
  async function loadMarkersFromDB() {
    const dbMarkers = await getMarkers();
    if (dbMarkers.length > 0) {
      markers = dbMarkers;
    }
  }

  onMount(async () => {
    console.log("App starting");
  });
</script>

<main>
  <div class="status-bar">
    <span>Status: {dbStatus}</span>
    {#if dbStatus === 'complete'}
      <span>Rows: {rowCount}</span>
    {/if}
  </div>
  
  <Map {markers} />
</main>

<style>
  main {
    width: 100%;
    height: 100vh;
    padding: 0;
    margin: 0;
    position: relative;
  }
  
  .status-bar {
    position: absolute;
    top: 10px;
    right: 10px;
    background-color: rgba(255, 255, 255, 0.8);
    padding: 5px 10px;
    border-radius: 4px;
    z-index: 1000;
    font-size: 14px;
    display: flex;
    gap: 10px;
  }
</style> 