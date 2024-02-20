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


function updateViewPromptContent(promptId) {
    const viewPromptElement = document.getElementById('view-prompt');
    if (!viewPromptElement) {
        console.log('View prompt element not found.');
        return;
    }

    chrome.storage.local.get({prompts: []}, data => {
        const prompt = data.prompts.find(p => String(p.id) === String(promptId));
        if (!prompt) {
            console.log('Prompt to update not found in storage.');
            return;
        }

        console.log('Attempting to update with:', prompt.title, prompt.content);

        const titleElement = viewPromptElement.querySelector('#prompt-view-title');
        const contentElement = viewPromptElement.querySelector('#prompt-view-content');

        if (titleElement && contentElement) {
            console.log('Before update:', titleElement.textContent, contentElement.textContent);

            titleElement.textContent = prompt.title;
            contentElement.textContent = prompt.content;

            console.log('After update:', titleElement.textContent, contentElement.textContent);
            console.log('View prompt content updated.');
        } else {
            console.log('Failed to find title or content elements within view prompt.');
        }
    });
}

// function renderViewPrompt(prompt) {
//     const viewPromptElement = document.getElementById('view-prompt');
//     if (!viewPromptElement) return;

//     viewPromptElement.innerHTML = `
//         <div class="prompt-view">
//             <h3 id="prompt-view-title">${prompt.title}</h3>
//             <p id="prompt-view-content">${prompt.content}</p>
//         </div>
//         <div class="prompt-actions">
//             <button class="copy-button fa fa-copy icon" data-content="${prompt.content}"></button>
//             <button class="edit-button fa fa-edit icon" data-id="${prompt.id}"></button>
//             <button class="delete-button fa fa-trash icon" data-id="${prompt.id}"></button>
//         </div>
//         <button id="close-view-button" class="fa fa-close icon"></button>
//     `;

//     // Add event listeners for copy, edit, delete, and close buttons
//     addViewAndCopyListeners(handleView, copyHandler);
    
//     // Show the overlay
//     showOverlay();
// }
// s