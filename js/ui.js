// Function to show the overlay
function showOverlay() {
    const overlay = document.getElementById('overlay');
    if (overlay) {
        overlay.style.display = 'block';
        console.log('Overlay displayed.'); // Add this log statement
    }
}

// Function to hide the overlay
function hideOverlay() {
    const overlay = document.getElementById('overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Function to show notification
function showNotification(message) {
    const notificationElement = document.getElementById('notification');
    notificationElement.textContent = message;
    notificationElement.style.display = 'block';
    setTimeout(() => {
        notificationElement.textContent = '';
        notificationElement.style.display = 'none';
    }, 2000); // Adjust duration as needed
}

function appendPrompts(prompts) {
    const listElement = document.getElementById('prompt-list');
    
    prompts.forEach(prompt => {
        const promptElement = document.createElement('div');
        promptElement.classList.add('prompt-list_item');
        promptElement.dataset.id = prompt.id; // Set the data-id attribute for potential future use
        promptElement.innerHTML = `
            <div class="top-content">
                <h3>${prompt.title}</h3>
                <p>${truncateString(prompt.content, 90)}</p>
            </div>
            <div class="bottom-content">
                <button class="view-button" data-id="${prompt.id}">Open</button>
                <button class="copy-button fa fa-copy icon" data-content="${prompt.content}"></button>
            </div>
        `;
        // Use prepend to add the newest prompts at the top
        listElement.prepend(promptElement);
    });

    // Assuming addViewAndCopyListeners is responsible for setting up event listeners on view and copy buttons
    addViewAndCopyListeners();
}


function truncateString(str, maxLength) {
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

function addViewAndCopyListeners(handleViewCallback, copyHandlerCallback) {
    const viewButtons = document.querySelectorAll('.view-button');
    const copyButtons = document.querySelectorAll('.copy-button');

    viewButtons.forEach(button => button.addEventListener('click', handleViewCallback));
    copyButtons.forEach(button => button.addEventListener('click', copyHandlerCallback));
}