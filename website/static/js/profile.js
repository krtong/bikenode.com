document.addEventListener("DOMContentLoaded", function () {
    // Example: simple form validation for adding a bike
    const bikeForm = document.getElementById("add-bike-form");
    if (bikeForm) {
        bikeForm.addEventListener("submit", function (e) {
            const motorcycleId = document.getElementById("motorcycle_id").value;
            if (!motorcycleId) {
                e.preventDefault();
                alert("Please select a motorcycle.");
            }
        });
    }
    // ...other dynamic features...
});
