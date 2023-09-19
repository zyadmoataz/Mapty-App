'use strict';
// =========================================================     DOM ELEMNTS         ======================================================
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// =========================================================     1-Workout Class         ======================================================
class Workout {
  //1-Public Class Fields:
  date = new Date(); //when the object is created
  id = (Date.now() + '').slice(-10);

  //2-Constructor:
  constructor(coords, distance, duration) {
    this.coords = coords; //[lat,lng]
    this.distance = distance; //km
    this.duration = duration; //min
  }

  //3-Private Methods:
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    // prettier-ignore
    this.discription = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
}

// =========================================================     2-Running Class         ======================================================
class Running extends Workout {
  //1-Public Class Fields:
  type = 'running';

  //2-Constructor:
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription(); //from workout class  [called here cause type is here]
  }

  //3-Private Methods:
  calcPace() {
    this.pace = this.duration / this.distance; //  min / km ==> Opposite of speed
    return this.pace;
  }
}
// =========================================================     3-Cycling Class       =======================================================

class Cycling extends Workout {
  //1-Public Class Fields:
  type = 'cycling';

  //2-Constructor:
  constructor(coords, distance, duration, elevationGain) {
    // this.cycling='cycling' same as above
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription(); //from workout class  [called here cause type is here]
  }

  //3-Private Methods:
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60); //km / h ==> Opposite of pace, divide by 60 to make it in min
    return this.speed;
  }
}

// =========================================================     4-Main App Class       =======================================================
class App {
  //1-Private Class Fields:
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  //2-Constructor:
  constructor() {
    //1-Get users position:
    this._getPosition();

    //2-Event Handlers:
    form.addEventListener('submit', this._newWorkout.bind(this)); //Display Marker
    inputType.addEventListener('change', this._toggleElevationField); //Change type
    containerWorkouts.addEventListener('click', this._moveToPopUp.bind(this)); //cause it has this keyword

    //3-Get data from local storage:
    this._getLocalStorage();
  }

  //3-Private Methods:
  _getPosition() {
    if (navigator.geolocation) {
      //Use Geolocation:
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          prompt("ERROR: Could't find your location!");
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, 13); //map parameter is an id in the html element
    L.tileLayer('https://cdn.lima-labs.com/{z}/{x}/{y}.png?api=demo', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this)); //Handling clicks on map

    this.#workouts.forEach(val => this._rederWorkoutMarker(val)); //The Solution
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();
    //1-Validate Function: Good Solution
    const validInputs = (...inputs) =>
      inputs.every(val => Number.isFinite(val));

    //2-Validate postive numbers:
    const allPositive = (...inputs) => inputs.every(val => val > 0);

    //1-Get data from form:
    let workout;
    const type = inputType.value;
    const distance = +inputDistance.value; //convert it into number
    const duration = +inputDuration.value; //convert it into number
    const { lat, lng } = this.#mapEvent.latlng;

    //2- If workout running, create running object:
    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      //Create a Running Object:
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    //3- If workout is cycling, create cycling object:
    if (type === 'cycling') {
      const elvation = +inputElevation.value;
      //Check if data is valid:
      if (
        !validInputs(distance, duration, elvation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');
      workout = new Cycling([lat, lng], distance, duration, elvation);
    }
    //4-Add new object to workout array:
    this.#workouts.push(workout);

    //5-Render workout on map as a marker:
    this._rederWorkoutMarker(workout);

    //6-Render workout on the list:
    this._renderWorkout(workout);

    //7-Hide form and Clear input fields:
    this._hideForm();

    //8-Set Local Storage to all workouts
    //Local Storage is a place in the browser where we can store dataeven afterwe have closed the page.
    //The data is linked to the URL in which we are using the application
    this._setLocalStorage();
  }

  _rederWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minwidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        }) // workout.type defined in cycling and runnig class as a porperty
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴'} ${workout.discription}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
       <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.discription}</h2>
          <div class="workout__details">
              <span span class="workout__icon">${
                workout.type === 'running' ? '🏃‍♂️' : '🚴'
              }</span>
              <span span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">min</span>
          </div>`;

    if (workout.type === 'running') {
      // prettier-ignore
      html += `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace.toFixed(1)}</span> <!-- to fixed(1) means 1 decimal fraction only-->
                <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.cadence}</span>
                <span class="workout__unit">spm</span>
            </div>
        </li>`;
    }

    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
           <span class="workout__icon">⚡️</span>
           <span class="workout__value">${workout.speed.toFixed(1)}</span>
           <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
           <span class="workout__icon">⛰</span>
           <span class="workout__value">${workout.elevationGain}</span>
           <span class="workout__unit">m</span>
        </div>
    </li> -->
      `;
    }

    //We cannot insert HTML to workouts 'Parent Element ' as we will want to insert it as a first or last child and we dont want that so
    //insert HTML as a sibling element next to 'form'
    form.insertAdjacentHTML('afterend', html); //insert is as a sibling after end of form
  }

  _hideForm() {
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = ''; // prettier-ignore

    form.style.display = 'none'; //display none
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000); //make it grid after 1 sec
  }

  _moveToPopUp(e) {
    //1-We will need the event to match the element we are looking for
    const workoutEl = e.target.closest('.workout'); //now we selected the entire element

    //2-if we select the whole container it will get null so use guard class
    if (!workoutEl) return;
    //now we can build the bridge using the id of the entire element to now which element is clicked

    //3-select clicked element
    const workout = this.#workouts.find(val => val.id === workoutEl.dataset.id);
    console.log(workout);

    //4-Take the coordinates from selected elementand move the map  to that position using leaflet method =>setView
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1, //duration of that animation},
      },
    }); //available on all map objects
  }

  _setLocalStorage() {
    //Local Storage is a key value store which cannot be used to store large amount of data
    //1-Convert the workouts array to a string
    const workoutsJSON = JSON.stringify(this.#workouts); //convert any object in JS to a string
    localStorage.setItem('workouts', workoutsJSON); // first give it a name second is a string that we want to store associated with the key of first argument
  }

  _getLocalStorage() {
    //THIS IS A PROBLEM AS WE WILL LOSE THE PROTOTYPE CHAIN!!
    const data = JSON.parse(localStorage.getItem('workouts')); //get string ack to object [array of given objects]

    if (!data) return; //guard class

    this.#workouts = data; //Restore Data

    //we dont need a new array so use for each to loop over them
    //NOTE!! We cannot add marker on map as this.#map isn't created yet as getLocalStorage is in the constructor after app is first loaded
    //To solve this we can insert it in loading the map
    this.#workouts.forEach(val => this._renderWorkout(val));
  }

  //4Public Methods:
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
