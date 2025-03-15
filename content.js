function typeMessage(message) {
    // Find the first text input or textarea field on the page
    let input = document.querySelector('input[type="text"], textarea, input[type="email"], input[type="password"]');
  
    if (input) {
      input.focus();  // Focus on the first available input field
      let i = 0;
      function typeCharacter() {
        if (i < message.length) {
          input.value += message[i];
          i++;
          setTimeout(typeCharacter, 100); // Simulates typing speed
        }a
      }
      typeCharacter();
    } else {
      alert("No text input field found on the page!");
    }
  }
  