document.getElementById("startTyping").addEventListener("click", () => {
    let message = document.getElementById("message").value;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            function: typeMessage,
            args: [message]
        });
    });

    // Access the webcam and capture an image
    const webcamElement = document.getElementById('webcam');
    const canvas = document.createElement('canvas');
    canvas.width = webcamElement.videoWidth;
    canvas.height = webcamElement.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(webcamElement, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/png');

    // Get the current date
    const currentDate = new Date().toLocaleDateString();

    // Retrieve existing entries from local storage
    chrome.storage.local.get({ entries: [] }, (result) => {
        const entries = result.entries || [];

        // Check if an entry already exists for the current date
        const existingEntry = entries.find(entry => new Date(entry.date).toLocaleDateString() === currentDate);
        // if (existingEntry) {
        //     alert("You can only make one entry per day.");
        //     return;
        // }

        // Add the new entry
        const date = new Date().toLocaleString();
        entries.push({ message, image: imageData, date });

        // Store the updated entries array in local storage
        chrome.storage.local.set({ entries }, () => {
            console.log("Entry stored in local storage.");
            displayStoredData(); // Update the displayed entries
        });
    });
});

// Access the webcam and display it in the popup
navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
        const webcamElement = document.getElementById('webcam');
        webcamElement.srcObject = stream;
    })
    .catch((error) => {
        console.error("Error accessing webcam: ", error);
    });

// Function to type the message into the most prominent text box
function typeMessage(message) {
    // Find all text input elements
    const textInputs = document.querySelectorAll('input[type="text"], textarea');

    if (textInputs.length === 0) {
        console.error("No text input elements found.");
        return;
    }

    // Find the most prominent text input (e.g., the one with the largest size)
    let mostProminentInput = textInputs[0];
    let maxArea = 0;

    textInputs.forEach(input => {
        const rect = input.getBoundingClientRect();
        const area = rect.width * rect.height;
        if (area > maxArea) {
            maxArea = area;
            mostProminentInput = input;
        }
    });

    // Focus the most prominent text input, clear it, and type the message
    mostProminentInput.focus();
    mostProminentInput.value = ''; // Clear existing text
    mostProminentInput.value = message; // Type new message
}

// Function to retrieve and display the stored entries
function displayStoredData() {
    chrome.storage.local.get({ entries: [] }, (result) => {
        const entries = result.entries || [];
        const carouselContent = document.getElementById('carouselContent');
        carouselContent.innerHTML = ''; // Clear existing content

        entries.forEach((entry, index) => {
            const entryDiv = document.createElement('div');
            entryDiv.classList.add('carousel-item');
            if (index === 0) entryDiv.classList.add('active');

            const img = document.createElement('img');
            img.src = entry.image;
            img.alt = 'Stored Image';

            const messageDiv = document.createElement('div');
            messageDiv.textContent = entry.message;

            const dateDiv = document.createElement('div');
            dateDiv.textContent = entry.date;

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete Entry';
            deleteButton.classList.add('delete-button');
            deleteButton.addEventListener('click', () => deleteEntry(index));

            entryDiv.appendChild(img);
            entryDiv.appendChild(messageDiv);
            entryDiv.appendChild(dateDiv);
            entryDiv.appendChild(deleteButton);
            carouselContent.appendChild(entryDiv);
        });
    });
}

// Function to delete an entry
function deleteEntry(index) {
    chrome.storage.local.get({ entries: [] }, (result) => {
        let entries = result.entries || [];
        entries.splice(index, 1); // Remove the entry at the specified index

        // Store the updated entries array in local storage
        chrome.storage.local.set({ entries }, () => {
            console.log("Entry deleted from local storage.");
            displayStoredData(); // Update the displayed entries
        });
    });
}

// Function to show the carousel and hide the camera and message input
function showCarousel() {
    document.getElementById('carousel').style.display = 'block';
    document.getElementById('webcam').style.display = 'none';
    document.getElementById('message').style.display = 'none';
    document.getElementById('startTyping').style.display = 'none';
    displayStoredData();
}

// Event listener for the "Past Entries" button
document.getElementById('library_button').addEventListener('click', showCarousel);

// Carousel navigation
let currentIndex = 0;

document.getElementById('prev').addEventListener('click', () => {
    const items = document.querySelectorAll('.carousel-item');
    items[currentIndex].classList.remove('active');
    currentIndex = (currentIndex === 0) ? items.length - 1 : currentIndex - 1;
    items[currentIndex].classList.add('active');
});

document.getElementById('next').addEventListener('click', () => {
    const items = document.querySelectorAll('.carousel-item');
    items[currentIndex].classList.remove('active');
    currentIndex = (currentIndex === items.length - 1) ? 0 : currentIndex + 1;
    items[currentIndex].classList.add('active');
});

// Function to create a timelapse video from stored images and download it
function createTimelapse() {
    chrome.storage.local.get({ entries: [] }, (result) => {
        const entries = result.entries || [];
        if (entries.length === 0) {
            console.error("No entries found.");
            return;
        }

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const firstImage = new Image();
        firstImage.src = entries[0].image;
        firstImage.onload = () => {
            canvas.width = firstImage.width;
            canvas.height = firstImage.height;

            const stream = canvas.captureStream();
            const recorder = new MediaRecorder(stream);
            const chunks = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'timelapse.webm';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            };

            recorder.start();

            let index = 0;
            const drawNextImage = () => {
                if (index < entries.length) {
                    const img = new Image();
                    img.src = entries[index].image;
                    img.onload = () => {
                        context.drawImage(img, 0, 0, canvas.width, canvas.height);
                        index++;
                        setTimeout(drawNextImage, 100); // Adjust the delay as needed
                    };
                } else {
                    recorder.stop();
                }
            };

            drawNextImage();
        };
    });
}

// Event listener for creating a timelapse video
document.getElementById('createTimelapse').addEventListener('click', createTimelapse);

// Call the function to display the stored entries when the popup is opened
document.addEventListener('DOMContentLoaded', displayStoredData);