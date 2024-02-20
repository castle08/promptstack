let currentPromptIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    ensureAllPromptsHaveIds();
    setupGreeting();
    setupFocusHandling();
    setupFormVisibility();
    setupSearchFunctionality();
    loadAndDisplayPrompts();

    // Call addEditAndDeleteListeners here to attach event listeners for edit and delete buttons
    addEditAndDeleteListeners();

    const addButton = document.getElementById('add-prompt');
    addButton.addEventListener('click', () => {
        const form = document.getElementById('prompt-form');
        // Reset the form and clear editing ID only if not currently editing
        if (!form.getAttribute('data-editing-id')) {
            form.reset();
            form.setAttribute('data-editing-id', '');
        }
        console.log('Add button clicked, form reset for new entry');
        form.classList.add('visible');
        showOverlay();
    });
    

    document.getElementById('prompt-list').addEventListener('click', (event) => {
        if (event.target.matches('.edit-button')) {
            handleEdit(event);
        } else if (event.target.matches('.delete-button')) {
            handleDelete(event);
        }
    });
    console.log("Adding event listener for form submission...");
    document.getElementById('prompt-form').addEventListener('submit', handleFormSubmit);
});

function ensureAllPromptsHaveIds() {
    chrome.storage.local.get({prompts: []}, (data) => {
        const updatedPrompts = data.prompts.map((prompt) => prompt.id ? prompt : {...prompt, id: Date.now().toString()});
        chrome.storage.local.set({prompts: updatedPrompts});
    });
}


function setupGreeting() {
    const greetingElement = document.getElementById('greeting');
    const hours = new Date().getHours();
    greetingElement.textContent = `Good ${hours < 12 ? 'morning' : hours < 18 ? 'afternoon' : 'evening'}`;
}

function setupFocusHandling() {
    const searchInput = document.getElementById('search-input');
    const searchDiv = document.getElementById('prompt-search');
    searchInput.addEventListener('focus', () => searchDiv.classList.add('focused'));
    searchInput.addEventListener('blur', () => searchDiv.classList.remove('focused'));
}

function setupFormVisibility() {
    const form = document.getElementById('prompt-form');
    const closeButton = document.getElementById('close-button');

    // Check if the event listener is already attached
    if (!closeButton.hasEventListener) {
        closeButton.addEventListener('click', () => {
            form.classList.remove('visible');
            console.log('Close button event listener attached');
            hideOverlay(); // Ensure overlay is hidden when form is closed
        });

        // Set a flag to indicate that the event listener has been attached
        closeButton.hasEventListener = true;
    }
}
function handleFormSubmit(event) {
    event.preventDefault(); // Prevent the default form submission behavior

    // Direct reference to the form element within the 'prompt-form' container
    const form = document.querySelector('#prompt-form form');
    if (!form) {
        console.error('Form not found');
        return;
    }

    // Now 'form' correctly references the form element, allowing us to call reset() on it
    const editingId = form.getAttribute('data-editing-id');

    const promptTitle = document.querySelector('#prompt-name').value.trim();
    const promptContent = document.querySelector('#prompt-content').value.trim();

    // Validate prompt title and content
    if (!promptTitle || !promptContent) {
        showNotification('Please fill in all fields.');
        return;
    }

    chrome.storage.local.get({ prompts: [] }, function(data) {
        let prompts = data.prompts;
        let operationSuccess = false;

        if (editingId) {
            // Editing existing prompt
            const index = prompts.findIndex(prompt => String(prompt.id) === String(editingId));
            if (index !== -1) {
                prompts[index] = { ...prompts[index], title: promptTitle, content: promptContent };
                operationSuccess = true;
                showNotification('Prompt updated successfully!');
            }
        } else {
            // Adding a new prompt
            const newPrompt = { id: Date.now().toString(), title: promptTitle, content: promptContent };
            prompts.unshift(newPrompt);
            operationSuccess = true;
            showNotification('Prompt saved successfully!');
        }

        if (operationSuccess) {
            chrome.storage.local.set({ prompts: prompts }, function() {
                // Clear form for next input
                form.reset();
                form.removeAttribute('data-editing-id');
                document.getElementById('prompt-form').classList.remove('visible');
                hideOverlay();
                loadAndDisplayPrompts(); // Refresh the list of prompts

                // After successful submission, update the view prompt content if it's open
                const viewPromptElement = document.getElementById('view-prompt');
                if (viewPromptElement) {
                    const titleElement = viewPromptElement.querySelector('#prompt-view-title');
                    const contentElement = viewPromptElement.querySelector('#prompt-view-content');
                    if (titleElement && contentElement) {
                        titleElement.textContent = promptTitle;
                        contentElement.textContent = promptContent;
                        console.log('View prompt content updated after form submission.');
                    }
                }
            });
        }
    });
}










function handleDelete(event) {
    if (!confirm("Are you sure you want to delete this prompt?")) return;
    const promptId = event.target.getAttribute('data-id');
    chrome.storage.local.get({ prompts: [] }, data => {
        const updatedPrompts = data.prompts.filter(prompt => prompt.id !== promptId);
        chrome.storage.local.set({ prompts: updatedPrompts }, () => {
            console.log('Prompt deleted successfully!');
            removePromptFromList(promptId); // Remove prompt from UI
            
            // Replace displayUpdatedPrompts with loadAndDisplayPrompts to refresh the prompt list
            loadAndDisplayPrompts();
            
            hideOverlay(); // Ensure the overlay is hidden after deletion
        });
    });
}


function removePromptFromList(id) {
    const promptElement = document.querySelector(`.prompt-list_item[data-id="${id}"]`);
    if (promptElement) {
        promptElement.remove();
    }
    // Close the detailed view if it's open for the deleted prompt
    const detailedView = document.getElementById('view-prompt');
    if (detailedView && detailedView.querySelector('.delete-button').getAttribute('data-id') === id) {
        detailedView.remove();
    }
}



function loadAndDisplayPrompts(loadMore = false) {
    const promptsPerPage = 6;

    chrome.storage.local.get({ prompts: [] }, (data) => {
        const startIndex = loadMore ? currentPromptIndex : 0;
        const endIndex = Math.min(startIndex + promptsPerPage, data.prompts.length);
        const promptsToDisplay = data.prompts.slice(startIndex, endIndex);

        if (loadMore) {
            appendPrompts(promptsToDisplay);
        } else {
            const listElement = document.getElementById('prompt-list');
            listElement.innerHTML = ''; // Clear the list to update with new prompts
            appendPrompts(promptsToDisplay);
        }

        currentPromptIndex = endIndex;
        document.getElementById('load-more-prompts').style.display = currentPromptIndex < data.prompts.length ? 'block' : 'none';
    });
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
        listElement.appendChild(promptElement);

        // Attach event listeners correctly
        const viewButton = promptElement.querySelector('.view-button');
        viewButton.addEventListener('click', handleView); // Pass the event handler directly without wrapping it

        const copyButton = promptElement.querySelector('.copy-button');
        copyButton.addEventListener('click', copyHandler);
    });
}





function displayPrompts(prompts) {
    const listElement = document.getElementById('prompt-list');
    listElement.innerHTML = ''; // Clear the list to update with new prompts

    prompts.forEach(prompt => {
        const promptElement = document.createElement('div');
        promptElement.className = 'prompt-list_item'; // Add class for styling
        promptElement.innerHTML = `
            <div>
                <h3>${prompt.title}</h3>
                <p>${truncateString(prompt.content, 90)}</p>
            </div>
            <div>
                <button class="view-button" data-id="${prompt.id}">Open</button>
                <button class="copy-button fa fa-copy icon" data-content="${prompt.content}"></button>
            </div>
        `;
        listElement.prepend(promptElement); // Use prepend to add the newest prompts at the top
    });

    addViewAndCopyListeners(); // Add listeners for newly added view and copy buttons
}




function handleView(event) {
    let element = event.target.closest('.view-button'); // Ensure we're getting the correct element with data-id
    if (element && element.dataset.id) {
        const promptId = element.dataset.id;
        chrome.storage.local.get({prompts: []}, data => {
            const promptToView = data.prompts.find(prompt => prompt.id === promptId);
            if (promptToView) {
                let existingViewPrompt = document.getElementById('view-prompt');
                if (existingViewPrompt) {
                    existingViewPrompt.remove();
                }

                const viewPromptElement = document.createElement('div');
                viewPromptElement.id = 'view-prompt';
                viewPromptElement.dataset.promptId = promptToView.id; // Assign the prompt ID to the view box
                viewPromptElement.classList.add('prompt-container');
                viewPromptElement.innerHTML = `
                    <div class="prompt-view">
                        <h3 id="prompt-view-title">${promptToView.title}</h3>
                        <p id="prompt-view-content">${promptToView.content}</p>
                    </div>
                    <div class="prompt-actions">
                        <button class="copy-button fa fa-copy icon" data-content="${promptToView.content}"></button>
                        <button class="edit-button fa fa-edit icon" data-id="${promptToView.id}"></button>
                        <button class="delete-button fa fa-trash icon" data-id="${promptToView.id}"></button>
                    </div>
                    <button id="close-view-button" class="fa fa-close icon"></button>
                `;

                document.body.appendChild(viewPromptElement);
                document.querySelector('#view-prompt .copy-button').addEventListener('click', copyHandler);
                document.querySelector('#view-prompt .edit-button').addEventListener('click', (event) => handleEdit(event));
                document.querySelector('#view-prompt .delete-button').addEventListener('click', (event) => {
                    event.preventDefault();
                    const customEvent = { target: { getAttribute: () => promptToView.id } };
                    handleDelete(customEvent);
                });
                document.getElementById('close-view-button').addEventListener('click', () => {
                    viewPromptElement.remove();
                    hideOverlay();
                });

                showOverlay();
            } else {
                console.error('Prompt not found');
            }
        });
    } else {
        console.error('Event target does not contain data-id attribute.');
    }
}






function addEditAndDeleteListeners() {
    const editButtons = document.querySelectorAll('.edit-button');
    const deleteButtons = document.querySelectorAll('.delete-button');

    editButtons.forEach(button => button.addEventListener('click', handleEdit));
    deleteButtons.forEach(button => button.addEventListener('click', handleDelete));
}

function handleEdit(event) {
    console.log('Edit button clicked');
    event.stopPropagation(); // Stop the event from propagating to parent elements

    const promptId = event.target.getAttribute('data-id');
    const form = document.getElementById('prompt-form');
    form.setAttribute('data-editing-id', promptId);
    console.log('Editing ID set on form:', promptId);

    // Update the content in the view prompt box if it's open with the prompt being edited
    const viewPromptElement = document.getElementById('view-prompt');
    console.log('View prompt element:', viewPromptElement);

    console.log('viewPromptElement.dataset.promptId:', viewPromptElement.dataset.promptId);
    console.log('promptId:', promptId);

    if (viewPromptElement && viewPromptElement.dataset.promptId === promptId) {
        console.log('promptId:', promptId);
        console.log('viewPromptElement dataset id:', viewPromptElement.dataset.promptId);

        chrome.storage.local.get({ prompts: [] }, data => {
            const promptToEdit = data.prompts.find(prompt => prompt.id === promptId);
            if (promptToEdit) {
                document.getElementById('prompt-name').value = promptToEdit.title;
                document.getElementById('prompt-content').value = promptToEdit.content;

                // Update form title
                const formTitle = document.querySelector('#prompt-form h2');
                formTitle.textContent = 'Edit Prompt'; // Update the form title

                console.log('Edit button clicked');
                form.classList.add('visible');

                // Hide overlay only if the view prompt box is closed
                const viewPromptOpen = viewPromptElement !== null;
                if (!viewPromptOpen) {
                    hideOverlay();
                }

                // Add event listener to handle form submission
                document.getElementById('prompt-form').addEventListener('submit', handleFormSubmit);

                // Update content in the view prompt box after the form is submitted
                // Commenting out updateViewPromptContent(promptId);
            }
        });
    } else {
        console.log('View prompt element not found or prompt ID does not match.');
    }
}







function removePromptFromList(id) {
    const promptElement = document.querySelector(`.prompt-list_item[data-id="${id}"]`);
    if (promptElement) {
        promptElement.remove();
    }
    // Close the detailed view if it's open for the deleted prompt
    const detailedView = document.getElementById('view-prompt');
    if (detailedView && detailedView.querySelector('.delete-button').getAttribute('data-id') === id) {
        detailedView.remove();
    }
}


function handleCopy() {
    const copyButtons = document.querySelectorAll('.copy-button');
    copyButtons.forEach(button => {
        button.removeEventListener('click', copyHandler); // Remove any existing event listener
        button.addEventListener('click', copyHandler); // Attach the event listener
    });
}

function copyHandler(event) {
    const content = event.currentTarget.getAttribute('data-content');
    navigator.clipboard.writeText(content).then(() => {
        showNotification('Copied');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showNotification('Failed to copy. Please try again.');
    });
}


function showPopupMessage(message) {
    const popup = document.createElement('div');
    popup.classList.add('popup-message');
    popup.textContent = message;
    document.body.appendChild(popup);
    setTimeout(() => {
        popup.remove();
    }, 2000);
}

function setupSearchFunctionality() {
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', function() {
        const searchTerm = searchInput.value.toLowerCase();
        chrome.storage.local.get({prompts: []}, data => {
            const filteredPrompts = data.prompts.filter(prompt => prompt.title.toLowerCase().includes(searchTerm) || prompt.content.toLowerCase().includes(searchTerm));
            document.getElementById('prompt-list').innerHTML = ''; 
            displayPrompts(filteredPrompts);
            document.getElementById('load-more-prompts').style.display = 'none'; 
        });
    });
}


