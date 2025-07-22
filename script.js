// Global variables
let registeredTeams = JSON.parse(localStorage.getItem('registeredTeams')) || [];
let teamScores = JSON.parse(localStorage.getItem('teamScores')) || {};
let currentTotal = 100;

// Stripe configuration (you'll need to replace with your actual publishable key)
const stripe = Stripe('pk_test_your_stripe_publishable_key_here');
let elements, paymentElement;

// Initialize page based on current page
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop();
    
    switch(currentPage) {
        case 'register.html':
            initializeRegistration();
            break;
        case 'scoreboard.html':
            initializeScoreboard();
            break;
        default:
            // Home page or other pages
            break;
    }
});

// Registration Functions
function initializeRegistration() {
    // Check team name availability as user types
    const teamNameInput = document.getElementById('teamName');
    if (teamNameInput) {
        teamNameInput.addEventListener('input', checkTeamNameAvailability);
    }

    // Set up form submission
    const registrationForm = document.getElementById('teamRegistrationForm');
    if (registrationForm) {
        registrationForm.addEventListener('submit', handleRegistrationSubmit);
    }
}

function showExistingTeam() {
    document.getElementById('existing-team-search').style.display = 'block';
    document.getElementById('new-team-form').style.display = 'none';
    document.getElementById('payment-section').style.display = 'none';
}

function showNewTeam() {
    document.getElementById('existing-team-search').style.display = 'none';
    document.getElementById('new-team-form').style.display = 'block';
    document.getElementById('payment-section').style.display = 'none';
}

function searchTeam() {
    const searchTerm = document.getElementById('teamSearch').value.toLowerCase();
    const results = document.getElementById('teamSearchResults');
    
    const foundTeams = registeredTeams.filter(team => 
        team.name.toLowerCase().includes(searchTerm)
    );
    
    if (foundTeams.length > 0) {
        results.innerHTML = '<h3>Found Teams:</h3>' + 
            foundTeams.map(team => `
                <div class="team-result">
                    <strong>${team.name}</strong> - Captain: ${team.captain}
                    <button onclick="joinTeam('${team.id}')" class="btn btn-primary">Join This Team</button>
                </div>
            `).join('');
    } else {
        results.innerHTML = '<p>No teams found. Try creating a new team instead.</p>';
    }
}

function joinTeam(teamId) {
    const team = registeredTeams.find(t => t.id === teamId);
    if (team && team.players.length < 4) {
        // Show form to add player to existing team
        alert(`Joining team: ${team.name}. Contact the team captain: ${team.captainEmail}`);
    } else {
        alert('This team is already full.');
    }
}

function checkTeamNameAvailability() {
    const teamName = document.getElementById('teamName').value;
    const errorDiv = document.getElementById('teamNameError');
    
    if (teamName.length > 0) {
        const exists = registeredTeams.some(team => 
            team.name.toLowerCase() === teamName.toLowerCase()
        );
        
        if (exists) {
            errorDiv.textContent = 'This team name is already taken. Please choose another.';
            errorDiv.style.display = 'block';
            return false;
        } else {
            errorDiv.textContent = '';
            errorDiv.style.display = 'none';
            return true;
        }
    }
    return true;
}

function updateTotal() {
    let total = 100; // Base registration fee
    
    if (document.getElementById('mulliganBags').checked) {
        total += 40; // $10 per player x 4 players
    }
    
    if (document.getElementById('puttingString').checked) {
        total += 5;
    }
    
    currentTotal = total;
    document.getElementById('totalAmount').textContent = total;
}

function handleRegistrationSubmit(e) {
    e.preventDefault();
    
    if (!checkTeamNameAvailability()) {
        return;
    }
    
    // Collect form data
    const teamData = {
        id: Date.now().toString(),
        name: document.getElementById('teamName').value,
        captain: document.getElementById('captainName').value,
        captainEmail: document.getElementById('captainEmail').value,
        captainPhone: document.getElementById('captainPhone').value,
        players: [],
        addOns: {
            mulliganBags: document.getElementById('mulliganBags').checked,
            puttingString: document.getElementById('puttingString').checked
        },
        total: currentTotal,
        registrationDate: new Date().toISOString()
    };
    
    // Collect player names
    const playerNames = document.querySelectorAll('.player-name');
    const playerEmails = document.querySelectorAll('.player-email');
    
    for (let i = 0; i < playerNames.length; i++) {
        if (playerNames[i].value.trim()) {
            teamData.players.push({
                name: playerNames[i].value.trim(),
                email: playerEmails[i].value.trim()
            });
        }
    }
    
    if (teamData.players.length < 4) {
        alert('Please enter all 4 player names.');
        return;
    }
    
    // Store team data temporarily
    sessionStorage.setItem('pendingTeamRegistration', JSON.stringify(teamData));
    
    // Show payment section
    showPaymentSection();
}

function showPaymentSection() {
    document.getElementById('new-team-form').style.display = 'none';
    document.getElementById('payment-section').style.display = 'block';
    
    // Initialize Stripe Elements
    initializeStripePayment();
}

function initializeStripePayment() {
    // Note: You'll need to implement server-side payment processing
    // This is a simplified client-side example
    
    const appearance = {
        theme: 'stripe',
        variables: {
            colorPrimary: '#1e3c72',
        }
    };
    
    // You'll need to create a PaymentIntent on your server and pass the client_secret
    // For now, we'll simulate the payment process
    
    document.getElementById('submit-payment').addEventListener('click', function() {
        // Simulate payment processing
        setTimeout(() => {
            completeRegistration();
        }, 2000);
        
        this.textContent = 'Processing...';
        this.disabled = true;
    });
}

function completeRegistration() {
    const teamData = JSON.parse(sessionStorage.getItem('pendingTeamRegistration'));
    
    // Add team to registered teams
    registeredTeams.push(teamData);
    localStorage.setItem('registeredTeams', JSON.stringify(registeredTeams));
    
    // Initialize empty scorecard for the team
    teamScores[teamData.id] = {
        teamName: teamData.name,
        captain: teamData.captain,
        scores: new Array(18).fill(null),
        totalScore: 0,
        holesCompleted: 0
    };
    localStorage.setItem('teamScores', JSON.stringify(teamScores));
    
    // Clear pending registration
    sessionStorage.removeItem('pendingTeamRegistration');
    
    // Show success message
    alert(`Registration complete! Team "${teamData.name}" has been registered successfully.`);
    
    // Redirect to home page
    window.location.href = 'index.html';
}

// Sponsor Functions
function emailSponsors(packageType) {
    const subject = encodeURIComponent(`Cauldron Cup 2025 - ${packageType} Inquiry`);
    const body = encodeURIComponent(`Hello,

I am interested in learning more about the ${packageType} for the Cauldron Cup 2025 golf tournament.

Please provide me with more details about this sponsorship opportunity.

Thank you!`);
    
    const mailtoLink = `mailto:Monique.Nelson@edwardjones.com,christopher.sanford.2@spaceforce.mil,charnetta.mcdonald.1@spaceforce.mil?subject=${subject}&body=${body}`;
    
    window.location.href = mailtoLink;
}

// Scoreboard Functions
function initializeScoreboard() {
    loadLeaderboard();
    populateTeamSelector();
    
    // Set up score submission form
    const scoreForm = document.getElementById('scoreSubmissionForm');
    if (scoreForm) {
        scoreForm.addEventListener('submit', handleScoreSubmission);
    }
}

function handleScoreSubmission(e) {
    e.preventDefault();
    
    const teamName = document.getElementById('submitTeamName').value;
    const captainName = document.getElementById('submitCaptainName').value;
    const holeNumber = parseInt(document.getElementById('holeNumber').value);
    const score = parseInt(document.getElementById('score').value);
    
    // Verify team exists and captain name matches
    const team = registeredTeams.find(t => 
        t.name.toLowerCase() === teamName.toLowerCase() && 
        t.captain.toLowerCase() === captainName.toLowerCase()
    );
    
    if (!team) {
        showMessage('Team name and captain name do not match our records.', 'error');
        return;
    }
    
    // Update score
    if (!teamScores[team.id]) {
        teamScores[team.id] = {
            teamName: team.name,
            captain: team.captain,
            scores: new Array(18).fill(null),
            totalScore: 0,
            holesCompleted: 0
        };
    }
    
    const teamScore = teamScores[team.id];
    
    // Check if score already exists for this hole
    if (teamScore.scores[holeNumber - 1] !== null) {
        if (!confirm('A score already exists for this hole. Do you want to update it?')) {
            return;
        }
    }
    
    // Update the score
    const oldScore = teamScore.scores[holeNumber - 1] || 0;
    teamScore.scores[holeNumber - 1] = score;
    teamScore.totalScore = teamScore.totalScore - oldScore + score;
    teamScore.holesCompleted = teamScore.scores.filter(s => s !== null).length;
    
    // Save to localStorage
    localStorage.setItem('teamScores', JSON.stringify(teamScores));
    
    // Update displays
    loadLeaderboard();
    populateTeamSelector();
    
    // Clear form and show success message
    e.target.reset();
    showMessage('Score submitted successfully!', 'success');
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('scoreSubmissionMessage');
    messageDiv.textContent = message;
    messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
    
    setTimeout(() => {
        messageDiv.textContent = '';
        messageDiv.className = '';
    }, 3000);
}

function loadLeaderboard() {
    const leaderboardBody = document.getElementById('leaderboardBody');
    if (!leaderboardBody) return;
    
    // Convert teamScores to array and sort by total score
    const teams = Object.values(teamScores)
        .filter(team => team.holesCompleted > 0)
        .sort((a, b) => a.totalScore - b.totalScore);
    
    const par = 72;
    
    leaderboardBody.innerHTML = teams.map((team, index) => {
        const toPar = team.totalScore - (par * team.holesCompleted / 18);
        const toParDisplay = toPar === 0 ? 'E' : (toPar > 0 ? `+${toPar}` : toPar);
        
        return `
            <tr>
                <td>${index + 1}</td>
                <td>${team.teamName}</td>
                <td>${team.captain}</td>
                <td>${team.totalScore}</td>
                <td>${team.holesCompleted}</td>
                <td>${toParDisplay}</td>
            </tr>
        `;
    }).join('');
    
    if (teams.length === 0) {
        leaderboardBody.innerHTML = '<tr><td colspan="6">No scores submitted yet</td></tr>';
    }
}

function populateTeamSelector() {
    const teamSelect = document.getElementById('teamSelect');
    if (!teamSelect) return;
    
    const teams = Object.values(teamScores).filter(team => team.holesCompleted > 0);
    
    teamSelect.innerHTML = '<option value="">Select a team to view scorecard</option>' +
        teams.map(team => `<option value="${team.teamName}">${team.teamName}</option>`).join('');
}

function showTeamScorecard() {
    const selectedTeam = document.getElementById('teamSelect').value;
    const scorecardDiv = document.getElementById('teamScorecard');
    const scorecardBody = document.getElementById('scorecardBody');
    
    if (!selectedTeam) {
        scorecardDiv.style.display = 'none';
        return;
    }
    
    const team = Object.values(teamScores).find(t => t.teamName === selectedTeam);
    if (!team) return;
    
    const par = [4,3,5,4,4,3,4,5,4,4,3,5,4,4,3,4,5,4];
    const front9Score = team.scores.slice(0, 9).reduce((sum, score) => sum + (score || 0), 0);
    const back9Score = team.scores.slice(9, 18).reduce((sum, score) => sum + (score || 0), 0);
    
    scorecardBody.innerHTML = `
        <tr>
            <td><strong>${team.teamName}</strong></td>
            ${team.scores.slice(0, 9).map(score => `<td>${score || '-'}</td>`).join('')}
            <td><strong>${front9Score || '-'}</strong></td>
            ${team.scores.slice(9, 18).map(score => `<td>${score || '-'}</td>`).join('')}
            <td><strong>${back9Score || '-'}</strong></td>
            <td><strong>${team.totalScore || '-'}</strong></td>
        </tr>
    `;
    
    scorecardDiv.style.display = 'block';
}

function showOverall() {
    loadLeaderboard();
    updateFilterButtons('overall');
}

function showFront9() {
    // Filter leaderboard for front 9 only
    updateFilterButtons('front9');
}

function showBack9() {
    // Filter leaderboard for back 9 only
    updateFilterButtons('back9');
}

function updateFilterButtons(active) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.filter-btn:nth-child(${active === 'overall' ? 1 : active === 'front9' ? 2 : 3})`).classList.add('active');
}

// Utility Functions
function generateTeamId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Auto-refresh scoreboard every 30 seconds if on scoreboard page
if (window.location.pathname.includes('scoreboard.html')) {
    setInterval(() => {
        loadLeaderboard();
    }, 30000);
}
// teams.js - Add to your existing script.js or create new file

class TeamManager {
    constructor() {
        this.teams = JSON.parse(localStorage.getItem('tournament-teams') || '[]');
        this.availableHoles = this.generateAvailableHoles();
        this.assignedHoles = JSON.parse(localStorage.getItem('assigned-holes') || '[]');
        this.init();
    }

    init() {
        this.renderTeams();
        this.updateStats();
        
        // Listen for new registrations
        window.addEventListener('playerRegistered', (event) => {
            this.handlePlayerRegistration(event.detail);
        });
    }

    generateAvailableHoles() {
        // Generate hole starting times (assuming 8-minute intervals)
        const holes = [];
        const startTime = new Date();
        startTime.setHours(8, 0, 0, 0); // Start at 8:00 AM

        for (let hole = 1; hole <= 18; hole++) {
            for (let timeSlot = 0; timeSlot < 4; timeSlot++) { // 4 time slots per hole
                const time = new Date(startTime.getTime() + (hole - 1) * 32 * 60000 + timeSlot * 8 * 60000);
                holes.push({
                    hole: hole,
                    time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    id: `hole-${hole}-slot-${timeSlot}`,
                    assigned: false
                });
            }
        }
        return holes;
    }

    handlePlayerRegistration(playerData) {
        let team = this.teams.find(t => t.name === playerData.teamName);
        
        if (!team) {
            team = {
                id: Date.now().toString(),
                name: playerData.teamName,
                players: [],
                isComplete: false,
                holeAssignment: null,
                registrationTime: new Date().toISOString()
            };
            this.teams.push(team);
        }

        // Add player if not already in team and team isn't full
        if (team.players.length < 4 && !team.players.find(p => p.email === playerData.email)) {
            team.players.push({
                name: playerData.name,
                email: playerData.email,
                phone: playerData.phone || '',
                registrationTime: new Date().toISOString()
            });
        }

        // Check if team is now complete
        if (team.players.length === 4 && !team.isComplete) {
            team.isComplete = true;
            this.assignHoleToTeam(team);
        }

        this.saveTeams();
        this.renderTeams();
        this.updateStats();
    }

    assignHoleToTeam(team) {
        // Find first available hole
        const availableHole = this.availableHoles.find(hole => !hole.assigned);
        
        if (availableHole) {
            availableHole.assigned = true;
            team.holeAssignment = {
                hole: availableHole.hole,
                time: availableHole.time,
                id: availableHole.id
            };
            
            this.assignedHoles.push({
                teamId: team.id,
                holeInfo: availableHole
            });
            
            localStorage.setItem('assigned-holes', JSON.stringify(this.assignedHoles));
            
            // Show notification
            this.showHoleAssignmentNotification(team);
        }
    }

    showHoleAssignmentNotification(team) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'hole-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <h3>🎉 Team Complete!</h3>
                <p><strong>${team.name}</strong> has been assigned:</p>
                <p><strong>Hole ${team.holeAssignment.hole}</strong> at <strong>${team.holeAssignment.time}</strong></p>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    renderTeams() {
        const container = document.getElementById('teams-container');
        if (!container) return;

        container.innerHTML = '';

        if (this.teams.length === 0) {
            container.innerHTML = `
                <div class="no-teams">
                    <h3>👻 No teams registered yet!</h3>
                    <p>Be the first to register your team for the Cauldron Cup!</p>
                    <a href="register.html" class="btn btn-primary">Register Now</a>
                </div>
            `;
            return;
        }

        // Sort teams: complete teams first, then by registration time
        const sortedTeams = [...this.teams].sort((a, b) => {
            if (a.isComplete && !b.isComplete) return -1;
            if (!a.isComplete && b.isComplete) return 1;
            return new Date(a.registrationTime) - new Date(b.registrationTime);
        });

        sortedTeams.forEach(team => {
            const teamCard = this.createTeamCard(team);
            container.appendChild(teamCard);
        });
    }

    createTeamCard(team) {
        const card = document.createElement('div');
        card.className = `team-card ${team.isComplete ? 'complete' : ''}`;
        
        const playersHtml = this.createPlayersHtml(team);
        const progressPercentage = (team.players.length / 4) * 100;
        
        card.innerHTML = `
            <div class="team-header">
                <div class="team-name">${team.name}</div>
                ${team.holeAssignment ? 
                    `<div class="hole-assignment">Hole ${team.holeAssignment.hole} - ${team.holeAssignment.time}</div>` : 
                    '<div class="hole-assignment">Awaiting Assignment</div>'
                }
            </div>
            <ul class="players-list">
                ${playersHtml}
            </ul>
            <div class="team-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                </div>
                <div class="progress-text">${team.players.length}/4 Players Registered</div>
            </div>
        `;
        
        return card;
    }

    createPlayersHtml(team) {
        let html = '';
        
        // Add registered players
        team.players.forEach(player => {
            html += `<li class="player-item">${player.name}</li>`;
        });
        
        // Add empty slots
        const emptySlots = 4 - team.players.length;
        for (let i = 0; i < emptySlots; i++) {
            html += `<li class="player-item empty-slot">Open Slot</li>`;
        }
        
        return html;
    }

    updateStats() {
        const completeTeams = this.teams.filter(team => team.isComplete).length;
        const partialTeams = this.teams.filter(team => !team.isComplete).length;
        const totalPlayers = this.teams.reduce((sum, team) => sum + team.players.length, 0);

        document.getElementById('complete-teams-count').textContent = completeTeams;
        document.getElementById('partial-teams-count').textContent = partialTeams;
        document.getElementById('total-players-count').textContent = totalPlayers;
    }

    saveTeams() {
        localStorage.setItem('tournament-teams', JSON.stringify(this.teams));
    }

    // Public method to manually add a team (for testing)
    addTestTeam(teamName, players = []) {
        const team = {
            id: Date.now().toString(),
            name: teamName,
            players: players,
            isComplete: players.length === 4,
            holeAssignment: null,
            registrationTime: new Date().toISOString()
        };

        if (team.isComplete) {
            this.assignHoleToTeam(team);
        }

        this.teams.push(team);
        this.saveTeams();
        this.renderTeams();
        this.updateStats();
    }
}

// Add CSS for notifications
const notificationCSS = `
.hole-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #4CAF50, #45a049);
    color: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
    z-index: 1000;
    animation: slideIn 0.5s ease;
    max-width: 300px;
}

.
// Add this to your existing script.js or replace the registration section

// Registration Functions - FIXED VERSION
function initializeRegistration() {
    // Check team name availability as user types
    const teamNameInput = document.getElementById('teamName');
    if (teamNameInput) {
        teamNameInput.addEventListener('input', checkTeamNameAvailability);
    }

    // Set up form submission
    const registrationForm = document.getElementById('teamRegistrationForm');
    if (registrationForm) {
        registrationForm.addEventListener('submit', handleRegistrationSubmit);
    }

    // Initialize total calculation
    updateTotal();
}

function showExistingTeam() {
    document.getElementById('existing-team-search').style.display = 'block';
    document.getElementById('new-team-form').style.display = 'none';
    document.getElementById('payment-section').style.display = 'none';
    
    // Update button states
    updateButtonStates('existing');
}

function showNewTeam() {
    document.getElementById('existing-team-search').style.display = 'none';
    document.getElementById('new-team-form').style.display = 'block';
    document.getElementById('payment-section').style.display = 'none';
    
    // Update button states
    updateButtonStates('new');
}

function updateButtonStates(activeType) {
    const buttons = document.querySelectorAll('.registration-options button');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (activeType === 'existing') {
        buttons[0].classList.add('active');
    } else {
        buttons[1].classList.add('active');
    }
}

function searchTeam() {
    const searchTerm = document.getElementById('teamSearch').value.toLowerCase().trim();
    const results = document.getElementById('teamSearchResults');
    
    if (!searchTerm) {
        results.innerHTML = '<p class="search-message">Please enter a team name to search.</p>';
        return;
    }

    const registeredTeams = JSON.parse(localStorage.getItem('registeredTeams')) || [];
    const foundTeams = registeredTeams.filter(team =>
        team.name.toLowerCase().includes(searchTerm)
    );

    if (foundTeams.length > 0) {
        results.innerHTML = '<h3>Found Teams:</h3>' +
            foundTeams.map(team => `
                <div class="team-result">
                    <div class="team-info">
                        <strong>${team.name}</strong>
                        <p>Captain: ${team.captain}</p>
                        <p>Players: ${team.players ? team.players.length : 0}/4</p>
                        <p>Email: ${team.captainEmail}</p>
                    </div>
                    ${team.players && team.players.length < 4 ? 
                        `<button onclick="showJoinTeamForm('${team.id}')" class="btn btn-primary">Join This Team</button>` :
                        `<span class="team-full">Team Full</span>`
                    }
                </div>
            `).join('');
    } else {
        results.innerHTML = `
            <div class="no-results">
                <p>No teams found matching "${searchTerm}".</p>
                <p>Try creating a new team instead.</p>
                <button onclick="showNewTeam()" class="btn btn-secondary">Create New Team</button>
            </div>
        `;
    }
}

function showJoinTeamForm(teamId) {
    const registeredTeams = JSON.parse(localStorage.getItem('registeredTeams')) || [];
    const team = registeredTeams.find(t => t.id === teamId);
    
    if (!team) {
        alert('Team not found.');
        return;
    }

    // Create join form
    const joinFormHTML = `
        <div class="join-team-form">
            <h3>Join Team: ${team.name}</h3>
            <p>Captain: ${team.captain}</p>
            <form id="joinTeamForm">
                <input type="hidden" id="joinTeamId" value="${teamId}">
                <div class="form-group">
                    <label for="joinPlayerName">Your Name *</label>
                    <input type="text" id="joinPlayerName" required>
                </div>
                <div class="form-group">
                    <label for="joinPlayerEmail">Your Email *</label>
                    <input type="email" id="joinPlayerEmail" required>
                </div>
                <div class="form-group">
                    <label for="joinPlayerPhone">Your Phone</label>
                    <input type="tel" id="joinPlayerPhone">
                </div>
                <button type="submit" class="btn btn-primary">Join Team</button>
                <button type="button" onclick="cancelJoinTeam()" class="btn btn-secondary">Cancel</button>
            </form>
        </div>
    `;

    document.getElementById('teamSearchResults').innerHTML = joinFormHTML;
    
    // Add event listener for join form
    document.getElementById('joinTeamForm').addEventListener('submit', handleJoinTeam);
}

function handleJoinTeam(e) {
    e.preventDefault();
    
    const teamId = document.getElementById('joinTeamId').value;
    const playerName = document.getElementById('joinPlayerName').value.trim();
    const playerEmail = document.getElementById('joinPlayerEmail').value.trim();
    const playerPhone = document.getElementById('joinPlayerPhone').value.trim();

    if (!playerName || !playerEmail) {
        alert('
// Add this to your existing script.js or replace the registration section

// Registration Functions - FIXED VERSION
function initializeRegistration() {
    // Check team name availability as user types
    const teamNameInput = document.getElementById('teamName');
    if (teamNameInput) {
        teamNameInput.addEventListener('input', checkTeamNameAvailability);
    }

    // Set up form submission
    const registrationForm = document.getElementById('teamRegistrationForm');
    if (registrationForm) {
        registrationForm.addEventListener('submit', handleRegistrationSubmit);
    }

    // Initialize total calculation
    updateTotal();
}

function showExistingTeam() {
    document.getElementById('existing-team-search').style.display = 'block';
    document.getElementById('new-team-form').style.display = 'none';
    document.getElementById('payment-section').style.display = 'none';
    
    // Update button states
    updateButtonStates('existing');
}

function showNewTeam() {
    document.getElementById('existing-team-search').style.display = 'none';
    document.getElementById('new-team-form').style.display = 'block';
    document.getElementById('payment-section').style.display = 'none';
    
    // Update button states
    updateButtonStates('new');
}

function updateButtonStates(activeType) {
    const buttons = document.querySelectorAll('.registration-options button');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (activeType === 'existing') {
        buttons[0].classList.add('active');
    } else {
        buttons[1].classList.add('active');
    }
}

function searchTeam() {
    const searchTerm = document.getElementById('teamSearch').value.toLowerCase().trim();
    const results = document.getElementById('teamSearchResults');
    
    if (!searchTerm) {
        results.innerHTML = '<p class="search-message">Please enter a team name to search.</p>';
        return;
    }

    const registeredTeams = JSON.parse(localStorage.getItem('registeredTeams')) || [];
    const foundTeams = registeredTeams.filter(team =>
        team.name.toLowerCase().includes(searchTerm)
    );

    if (foundTeams.length > 0) {
        results.innerHTML = '<h3>Found Teams:</h3>' +
            foundTeams.map(team => `
                <div class="team-result">
                    <div class="team-info">
                        <strong>${team.name}</strong>
                        <p>Captain: ${team.captain}</p>
                        <p>Players: ${team.players ? team.players.length : 0}/4</p>
                        <p>Email: ${team.captainEmail}</p>
                    </div>
                    ${team.players && team.players.length < 4 ? 
                        `<button onclick="showJoinTeamForm('${team.id}')" class="btn btn-primary">Join This Team</button>` :
                        `<span class="team-full">Team Full</span>`
                    }
                </div>
            `).join('');
    } else {
        results.innerHTML = `
            <div class="no-results">
                <p>No teams found matching "${searchTerm}".</p>
                <p>Try creating a new team instead.</p>
                <button onclick="showNewTeam()" class="btn btn-secondary">Create New Team</button>
            </div>
        `;
    }
}

function showJoinTeamForm(teamId) {
    const registeredTeams = JSON.parse(localStorage.getItem('registeredTeams')) || [];
    const team = registeredTeams.find(t => t.id === teamId);
    
    if (!team) {
        alert('Team not found.');
        return;
    }

    // Create join form
    const joinFormHTML = `
        <div class="join-team-form">
            <h3>Join Team: ${team.name}</h3>
            <p>Captain: ${team.captain}</p>
            <form id="joinTeamForm">
                <input type="hidden" id="joinTeamId" value="${teamId}">
                <div class="form-group">
                    <label for="joinPlayerName">Your Name *</label>
                    <input type="text" id="joinPlayerName" required>
                </div>
                <div class="form-group">
                    <label for="joinPlayerEmail">Your Email *</label>
                    <input type="email" id="joinPlayerEmail" required>
                </div>
                <div class="form-group">
                    <label for="joinPlayerPhone">Your Phone</label>
                    <input type="tel" id="joinPlayerPhone">
                </div>
                <button type="submit" class="btn btn-primary">Join Team</button>
                <button type="button" onclick="cancelJoinTeam()" class="btn btn-secondary">Cancel</button>
            </form>
        </div>
    `;

    document.getElementById('teamSearchResults').innerHTML = joinFormHTML;
    
    // Add event listener for join form
    document.getElementById('joinTeamForm').addEventListener('submit', handleJoinTeam);
}

function handleJoinTeam(e) {
    e.preventDefault();
    
    const teamId = document.getElementById('joinTeamId').value;
    const playerName = document.getElementById('joinPlayerName').value.trim();
    const playerEmail = document.getElementById('joinPlayerEmail').value.trim();
    const playerPhone = document.getElementById('joinPlayerPhone').value.trim();

    if (!playerName || !playerEmail) {
        alert('Please fill in all required fields.');
        return;
    }

    let registeredTeams = JSON.parse(localStorage.getItem('registeredTeams')) || [];
    const teamIndex = registeredTeams.findIndex(t => t.id === teamId);
    
    if (teamIndex === -1) {
        alert('Team not found.');
        return;
    }

    const team = registeredTeams[teamIndex];
    
    // Check if team is full
    if (team.players && team.players.length >= 4) {
        alert('This team is already full.');
        return;
    }

    // Check if email already exists
    const emailExists = team.players && team.players.some(p => p.email.toLowerCase() === playerEmail.toLowerCase());
    if (emailExists) {
        alert('This email is already registered on this team.');
        return;
    }

    // Add player to team
    if (!team.players) team.players = [];
    team.players.push({
        name: playerName,
        email: playerEmail,
        phone: playerPhone,
        joinedAt: new Date().toISOString()
    });

    // Save updated teams
    registeredTeams[teamIndex] = team;
    localStorage.setItem('registeredTeams', JSON.stringify(registeredTeams));

    // Show success message
    alert(`Successfully joined team "${team.name}"! You will receive confirmation details at ${playerEmail}.`);
    
    // Clear form and show updated search results
    document.getElementById('teamSearch').value = team.name;
    searchTeam();
}

function cancelJoinTeam() {
    // Go back to search results
    searchTeam();
}

function checkTeamNameAvailability() {
    const teamName = document.getElementById('teamName').value.trim();
    const errorDiv = document.getElementById('teamNameError');
    
    if (teamName.length === 0) {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
        return true;
    }

    const registeredTeams = JSON.parse(localStorage.getItem('registeredTeams')) || [];
    const exists = registeredTeams.some(team =>
        team.name.toLowerCase() === teamName.toLowerCase()
    );

    if (exists) {
        errorDiv.textContent = 'This team name is already taken. Please choose another.';
        errorDiv.style.display = 'block';
        return false;
    } else {
        errorDiv.textContent = '✓ Team name is available!';
        errorDiv.style.display = 'block';
        errorDiv.style.color = 'var(--success-green)';
        return true;
    }
}

function updateTotal() {
    let total = 340; // Base registration fee: $85 x 4 players
    
    const mulliganBags = document.getElementById('mulliganBags');
    const puttingString = document.getElementById('puttingString');
    
    if (mulliganBags && mulliganBags.checked) {
        total += 40; // $10 per player x 4 players
    }
    if (puttingString && puttingString.checked) {
        total += 5;
    }
    
    const totalElement = document.getElementById('totalAmount');
    if (totalElement) {
        totalElement.textContent = total;
    }
    
    return total;
}

function handleRegistrationSubmit(e) {
    e.preventDefault();
    
    // Validate team name
    if (!checkTeamNameAvailability()) {
        document.getElementById('teamName').focus();
        return;
    }

    // Collect form data
    const teamData = {
        id: 'team_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name: document.getElementById('teamName').value.trim(),
        captain: document.getElementById('captainName').value.trim(),
        captainEmail: document.getElementById('captainEmail').value.trim(),
        captainPhone: document.getElementById('captainPhone').value.trim(),
        players: [],
        addOns: {
            mulliganBags: document.getElementById('mulliganBags').checked,
            puttingString: document.getElementById('puttingString').checked
        },
        total: updateTotal(),
        registrationDate: new Date().toISOString(),
        paymentStatus: 'pending'
    };

    // Validate required fields
    if (!teamData.name || !teamData.captain || !teamData.captainEmail || !teamData.captainPhone) {
        alert('Please fill in all required fields.');
        return;
    }

    // Collect player names and emails
    const playerNames = document.querySelectorAll('.player-name');
    const playerEmails = document.querySelectorAll('.player-email');
    
    for (let i = 0; i < playerNames.length; i++) {
        const name = playerNames[i].value.trim();
        const email = playerEmails[i].value.trim();
        
        if (name) {
            teamData.players.push({
                name: name,
                email: email || '',
                phone: '',
                registeredAt: new Date().toISOString()
            });
        }
    }

    if (teamData.players.length === 0) {
        alert('Please enter at least the team captain as a player.');
        return;
    }

    // Store team data temporarily for payment
    sessionStorage.setItem('pendingTeamRegistration', JSON.stringify(teamData));
    
    // Show payment section
    showPaymentSection(teamData);
}

function showPaymentSection(teamData) {
    document.getElementById('new-team-form').style.display = 'none';
    document.getElementById('payment-section').style.display = 'block';
    
    // Update payment section with team details
    const paymentSection = document.getElementById('payment-section');
    paymentSection.innerHTML = `
        <h2>Complete Registration</h2>
        <div class="payment-summary">
            <h3>Registration Summary</h3>
            <div class="summary-details">
                <p><strong>Team:</strong> ${teamData.name}</p>
                <p><strong>Captain:</strong> ${teamData.captain}</p>
                <p><strong>Players:</strong> ${teamData.players.length}/4</p>
                <p><strong>Add-ons:</strong></p>
                <ul>
                    ${teamData.addOns.mulliganBags ? '<li>Mulligan Bags: $40</li>' : ''}
                    ${teamData.addOns.puttingString ? '<li>12" Putting String: $5</li>' : ''}
                </ul>
                <p class="total-cost"><strong>Total: $${teamData.total}</strong></p>
            </div>
        </div>
        
        <div class="payment-options">
            <h3>Payment Options</h3>
            <button onclick="completeRegistration()" class="btn btn-primary full-width">
                Complete Registration (Demo Mode)
            </button>
            <p class="payment-note">
                <small>In demo mode, registration will be completed without payment processing.</small>
            </p>
        </div>
        
        <button onclick="goBackToForm()" class="btn btn-secondary">← Back to Form</button>
    `;
}

function goBackToForm() {
    document.getElementById('payment-section').style.display = 'none';
    document.getElementById('new-team-form').style.display = 'block';
}

function completeRegistration() {
    const teamData = JSON.parse(sessionStorage.getItem('pendingTeamRegistration'));
    
    if (!teamData) {
        alert('Registration data not found. Please try again.');
        return;
    }

    // Get existing teams
    let registeredTeams = JSON.parse(localStorage.getItem('registeredTeams')) || [];
    
    // Mark as paid and add to registered teams
    teamData.paymentStatus = 'completed';
    teamData.paymentDate = new Date().toISOString();
    
    registeredTeams.push(teamData);
    localStorage.setItem('registeredTeams', JSON.stringify(registeredTeams));
    
    // Clear pending registration
    sessionStorage.removeItem('pendingTeamRegistration');
    
    // Show success message
    showRegistrationSuccess(teamData);
}

function showRegistrationSuccess(teamData) {
    document.getElementById('payment-section').innerHTML = `
        <div class="registration-success">
            <h2>🎉 Registration Complete!</h2>
            <div class="success-details">
                <p><strong>Team "${teamData.name}" has been successfully registered!</strong></p>
                <p>Registration ID: ${teamData.id}</p>
                <p>Total Paid: $${teamData.total}</p>
                <p>Confirmation sent to: ${teamData.captainEmail}</p>
                
                ${teamData.players.length === 4 ? 
                    '<p class="tee-time-notice">🏌️ Your tee time will be automatically assigned and you\'ll be notified via email.</p>' :
                    '<p class="team-incomplete">⚠️ Your team has ' + teamData.players.length + '/4 players. Add remaining players to get your tee time assignment.</p>'
                }
            </div>
            
            <div class="next-steps">
                <h3>Next Steps:</h3>
                <ul>
                    <li>Check your email for confirmation details</li>
                    <li>Visit the <a href="teetimes.html">Tee Times page</a> to see your assignment</li>
                    <li>Download the tournament app for live scoring</li>
                </ul>
            </div>
            
            <div class="success-actions">
                <a href="teetimes.html" class="btn btn-primary">View Tee Times</a>
                <a href="index.html" class="btn btn-secondary">Back to Home</a>
                <button onclick="registerAnotherTeam()" class="btn btn-outline">Register Another Team</button>
            </div>
        </div>
    `;
}

function registerAnotherTeam() {
    // Reset the form
    location.reload();
}

// Make sure these functions are available globally
window.showExistingTeam = showExistingTeam;
window.showNewTeam = showNewTeam;
