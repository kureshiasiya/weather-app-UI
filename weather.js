const API_KEY = "faaf634317aa5bdcc940d86a16476691";
let currentUnit = "metric";

async function searchWeather() {
  const city = document.getElementById("cityInput").value || "New York";

  try {
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
      city
    )}&limit=1&appid=${API_KEY}`;
    const geoResponse = await fetch(geoUrl);
    const geoData = await geoResponse.json();

    if (!geoData.length) {
      throw new Error("City not found");
    }

    // Set unit based on country
    const countryCode = geoData[0].country;
    // US uses imperial, most other countries use metric
    const newUnit = countryCode === "US" ? "imperial" : "metric";

    // Only update if unit changed
    if (currentUnit !== newUnit) {
      currentUnit = newUnit;
      updateUnitCircles();
    }

    const { lat, lon } = geoData[0];

    // Then get current weather, forecast and air quality data
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`;
    const airQualityUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

    const [weatherResponse, forecastResponse, airQualityResponse] =
      await Promise.all([
        fetch(weatherUrl),
        fetch(forecastUrl),
        fetch(airQualityUrl),
      ]);

    const weatherData = await weatherResponse.json();
    const forecastData = await forecastResponse.json();
    const airQualityData = await airQualityResponse.json();

    // Update the dashboard
    updateDashboard({
      current: weatherData,
      forecast: forecastData,
      airQuality: airQualityData,
      location: geoData[0],
    });
  } catch (error) {
    console.error("Error details:", error);
    alert("Unable to fetch weather data. Please try again.");
  }
}

function updateDashboard(data) {
  try {
    // 1. Update main temperature
    const temp = Math.round(data.current.main.temp);
    document.getElementById("temperature").textContent = `${temp}°${
      currentUnit === "metric" ? "C" : "F"
    }`;

    // 2. Update date
    updateDateTime();

    // 3. Update weather description
    const weatherDesc = data.current.weather[0].description;
    document.getElementById("weatherDescription").innerHTML = `
            <img src="cloud.jpg" alt="Cloud" class="cloud-icon" />
            ${capitalizeFirstLetter(weatherDesc)}
        `;

    // 4. Update weather icon
    document.getElementById(
      "weatherIcon"
    ).src = `https://openweathermap.org/img/wn/${data.current.weather[0].icon}@2x.png`;

    // 5. Update rain chance (from first forecast period)
    const rainProb = (data.forecast.list[0].pop || 0) * 100;
    document.getElementById("rainChance").innerHTML = `
            <img src="rain2.jpg" alt="Rain" class="rain-icon" />
            Rain - ${Math.round(rainProb)}%
        `;

    // 6. Update location
    const locationParts = [
      data.location.name,
      data.location.state,
      data.location.country,
    ].filter(Boolean);

    document.getElementById("location").innerHTML = `
            <img src="USA.jpg" alt="Location" class="location-image" />
            <div class="location-text">${locationParts.join(", ")}</div>
        `;

    // 7. Update basic weather data with air quality
    if (data.airQuality && data.airQuality.list && data.airQuality.list[0]) {
      const aqi = data.airQuality.list[0].main.aqi;
      document.getElementById("airQuality").textContent = aqi;
      document.getElementById("airQualityStatus").textContent =
        getAirQualityStatus(aqi);
    }

    // Calculate and update UV index
    const uvIndex = calculateUVIndex(data.current);
    document.getElementById("uvIndex").textContent = uvIndex;

    updateWeatherHighlights(data.current);
    updateWeeklyForecast(data.forecast);
    updateUnitCircles();
  } catch (error) {
    console.error("Error updating dashboard:", error);
  }
}

function updateWeatherHighlights(data) {
  // Wind
  const windSpeed = data.wind.speed;
  const windUnit = currentUnit === "metric" ? "m/s" : "mph";
  document.getElementById("windSpeed").textContent = `${windSpeed} ${windUnit}`;
  document.getElementById("windDirection").textContent = getWindDirection(
    data.wind.deg
  );

  // Sunrise & Sunset
  const sunrise = new Date(data.sys.sunrise * 1000);
  const sunset = new Date(data.sys.sunset * 1000);
  document.getElementById("sunrise").textContent = formatTime(sunrise);
  document.getElementById("sunset").textContent = formatTime(sunset);

  // Humidity
  const humidity = data.main.humidity;
  document.getElementById("humidity").textContent = `${humidity}%`;
  document.getElementById("humidityStatus").textContent =
    getHumidityStatus(humidity);

  // Visibility
  const visibilityKm = (data.visibility / 1000).toFixed(1);
  document.getElementById("visibility").textContent = `${visibilityKm} km`;
  document.getElementById("visibilityStatus").textContent =
    getVisibilityStatus(visibilityKm);
}

function updateWeeklyForecast(forecastData) {
  const weekForecast = document.getElementById("weekForecast");
  weekForecast.innerHTML = "";

  const dailyData = forecastData.list
    .filter((item) => item.dt_txt.includes("12:00:00"))
    .slice(0, 5);

  dailyData.forEach((day) => {
    const date = new Date(day.dt * 1000);
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
    const temp = Math.round(day.main.temp);
    const iconCode = day.weather[0].icon;

    const dayElement = document.createElement("div");
    dayElement.className = "day";
    dayElement.innerHTML = `
            <div class="day-name">${dayName}</div>
            <img src="https://openweathermap.org/img/wn/${iconCode}.png" 
                 alt="Weather Icon" class="day-icon custom-icon">
            <div class="day-temp">${temp}°${
      currentUnit === "metric" ? "C" : "F"
    }</div>
        `;

    weekForecast.appendChild(dayElement);
  });
}

function updateDateTime() {
  const now = new Date();
  document.getElementById("date").textContent = now.toLocaleString("en-US", {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTime(date) {
  return date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getWindDirection(degree) {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const index = Math.round(degree / 22.5) % 16;
  return directions[index];
}

function getHumidityStatus(humidity) {
  if (humidity <= 30) return "Low 😓";
  if (humidity <= 60) return "Normal 🙂";
  return "High 💧";
}

function getVisibilityStatus(visibility) {
  if (visibility <= 3) return "Poor 😷";
  if (visibility <= 8) return "Average 😐";
  return "Good 😊";
}

function getAirQualityStatus(aqi) {
  switch (aqi) {
    case 1:
      return "Good 😊";
    case 2:
      return "Fair 🙂";
    case 3:
      return "Moderate 😐";
    case 4:
      return "Poor 😷";
    case 5:
      return "Very Poor 🤢";
    default:
      return "Unknown";
  }
}

function calculateUVIndex(weatherData) {
  const clouds = weatherData.clouds.all;
  const time = new Date(weatherData.dt * 1000).getHours();

  let baseUV;
  if (time >= 10 && time <= 16) {
    baseUV = 10; // Peak hours
  } else if ((time >= 7 && time <= 9) || (time >= 17 && time <= 19)) {
    baseUV = 5; // Morning/Evening
  } else {
    baseUV = 1; // Night time
  }

  // Reduce based on cloud coverage
  return Math.round(baseUV * (1 - clouds / 100));
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function updateUnitCircles() {
  const metricCircle = document.querySelector(".unit-circle:first-child");
  const imperialCircle = document.querySelector(".unit-circle:last-child");

  if (currentUnit === "metric") {
    metricCircle.classList.add("active");
    imperialCircle.classList.remove("active");
  } else {
    metricCircle.classList.remove("active");
    imperialCircle.classList.add("active");
  }
}

function setUnit(unit) {
  if (currentUnit !== unit) {
    currentUnit = unit;
    searchWeather(); // Fetch new data with new unit
  }
}

// Initialize the dashboard
document.addEventListener("DOMContentLoaded", () => {
  // Initial weather fetch
  searchWeather();

  // Update time every minute
  setInterval(updateDateTime, 60000);

  // Add event listeners
  document
    .querySelector(".search-btn")
    ?.addEventListener("click", searchWeather);
  document.getElementById("cityInput")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchWeather();
    }
  });
});
