async function main() {
  try {
    const res = await fetch('http://localhost:3000/api/db/incidents');
    const json = await res.json();
    console.log("Response data:", json.data?.[0]);
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
