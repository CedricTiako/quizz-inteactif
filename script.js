const API_BASE_URL = 'https://ayoba-yamo-quizz.zen-apps.com/api/index.php';

let currentQuestionIndex = 0;
let userId = 1; 
let questions = [];
let currentQuestion = null;
let hasAnswered = false;
let answeredQuestions = new Set();
let userStats = null;
let tickets = []; 
const preferredLang = localStorage.getItem('preferred_language') || navigator.language.split('-')[0];

const REWARDS = [
    { points: 100, name: 'Badge Bronze', icon: '🥉' },
    { points: 250, name: 'Accès Premium', icon: '⭐' },
    { points: 500, name: 'Contenu Exclusif', icon: '👑' }
];

const MAX_POINTS = REWARDS[REWARDS.length - 1].points;

// Fonction pour mélanger un tableau (algorithme de Fisher-Yates)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

async function initializeUI() {
    console.log('Initializing UI...');
    // Attendre que le DOM soit complètement chargé
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeUIHandler);
    } else {
        initializeUIHandler();
    }
}

async function initializeUIHandler() {
    console.log('Initializing UI handler...');
    const totalPoints = document.getElementById('total-points');
    const correctAnswers = document.getElementById('correct-answers');
    const progressBar = document.getElementById('rewards-progress-bar');
    const quizLoader = document.getElementById('quiz-loader');
    const quizContent = document.getElementById('quiz-content');

    if (totalPoints) totalPoints.textContent = '0';
    if (correctAnswers) correctAnswers.textContent = '0';
    if (progressBar) progressBar.style.width = '0%';
    
    try {
        // Afficher le loader
        if (quizLoader) quizLoader.classList.remove('hidden');
        if (quizContent) quizContent.classList.add('hidden');
        
        // Charger les questions
        await loadQuestions();
        
        // Cacher le loader et afficher le contenu
        if (quizLoader) quizLoader.classList.add('hidden');
        if (quizContent) quizContent.classList.remove('hidden');
        
        // Afficher la première question
        console.log('Showing first question...65' );
        showQuestion();

    } catch (error) {
        console.error('Erreur lors du chargement des questions:', error);
        showFeedback('Erreur lors du chargement des questions. Veuillez réessayer.', 'error');
    }
}

async function loadAndDisplayStats() {
    console.log('Loading user stats...');
    try {
        const response = await axios.get(`${API_BASE_URL}?lang=${preferredLang}&endpoint=user_stats&user_id=${userId}`);
        if (!response.ok) throw new Error('Failed to load user stats');
        const data = await response.json();
        console.log('User stats loaded:', data);
        userStats = data;

        const totalPointsElement = document.getElementById('total-points');
        const correctAnswersElement = document.getElementById('correct-answers');
        
        if (totalPointsElement) {
            totalPointsElement.textContent = data.user.total_points_earned || 0;
        }
        if (correctAnswersElement) {
            correctAnswersElement.textContent = data.user.total_correct_answers || 0;
        }

        updateRewardsProgress(data.user.total_points_earned || 0);
    } catch (error) {
        console.error('Error loading user stats:', error);
        showFeedback('Erreur lors du chargement des statistiques', 'error');
    }
}

async function loadQuestions() {
    console.log('Loading questions...');
    try {
        const response = await fetch(`${API_BASE_URL}?lang=${preferredLang}&endpoint=questions`);
        if (!response.ok) throw new Error('Failed to load questions');
        const data = await response.json();
        console.log('Questions loaded:', data);
        
        // Map question_id to id
        questions = data.map(q => ({
            id: q.question_id,
            question_text: q.question_text,
            category_id: q.category_id,
            level_id: q.level_id,
            created_at: q.created_at
        }));
        return questions;
    } catch (error) {
        console.error('Error loading questions:', error);
        showFeedback('Erreur lors du chargement des questions', 'error');
        throw error;
    }
}

async function loadAnswers(questionId) {
    try {
        const response = await axios.get(`https://ayoba-yamo-quizz.zen-apps.com/api/index.php?lang=${preferredLang}&endpoint=answers&question_id=${questionId}`);
        const answers = response.data;
        const answersContainer = document.getElementById('answers-container');
        answersContainer.innerHTML = ''; // Clear previous answers
        
        answers.forEach(answer => {
            const answerButton = document.createElement('button');
            answerButton.className = 'answer-button w-full text-left p-4';
            answerButton.id = `answer-${answer.answer_id}`; // Set unique ID using answer_id
            answerButton.innerHTML = `
                <div class="flex items-center">
                    <span class="text-lg">${answer.answer_text}</span>
                </div>
            `;
            
            // Stocker si la réponse est correcte dans un attribut data
            answerButton.dataset.correct = answer.is_correct;
            console.log('answerButton.dataset.correct:', answer.is_correct);
            
            // Ajouter l'écouteur d'événement pour appeler handleAnswer au clic
            answerButton.addEventListener('click', () => handleAnswer(answer.answer_id, answer.is_correct, answerButton));
            answersContainer.appendChild(answerButton);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des réponses:', error);
    }
}

async function loadTickets() {
    console.log('Loading tickets...');
    try {
        const response = await axios.get(`${API_BASE_URL}?lang=${preferredLang}&endpoint=get_all_tickets`);
        tickets = response.data;
        console.log('Tickets loaded:', tickets);
        return tickets;
    } catch (error) {
        console.error('Error loading tickets:', error);
        showFeedback('Impossible de charger les récompenses', 'error');
        return [];
    }
}

async function createUser(username, email, password) {
    console.log('Creating user...');
    try {
        const response = await fetch(`${API_BASE_URL}?lang=${preferredLang}&endpoint=users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                email,
                password
            })
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la création de l\'utilisateur');
        }

        const data = await response.json();
        console.log('User created:', data);
        showFeedback('Compte créé avec succès !', 'success');
        return data;
    } catch (error) {
        console.error('Erreur:', error);
        showFeedback('Erreur lors de la création du compte', 'error');
        throw error;
    }
}

async function showQuestion() {
    console.log('Showing question...');
    if (currentQuestionIndex < questions.length) {
        currentQuestion = questions[currentQuestionIndex];
        
        // Check if currentQuestion has a valid id
        if (!currentQuestion.id) {
            console.error('showQuestion: currentQuestion.id is missing');
            showFeedback('Erreur: ID de la question manquant', 'error');
            return;
        }
        
        // Mise à jour de l'indicateur de progression
        document.getElementById('current-question').textContent = currentQuestionIndex + 1;
        document.getElementById('total-questions').textContent = questions.length;
        
        // Mise à jour de la barre de progression
        const progressBar = document.getElementById('progress-bar');
        const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
        progressBar.style.width = `${progress}%`;
        
        // Affichage de la question
        const questionContainer = document.getElementById('question-container');
        questionContainer.textContent = currentQuestion.question_text;
        
        // Affichage des réponses
        const answersContainer = document.getElementById('answers-container');
        answersContainer.innerHTML = '';
        
        try {
            // Load answers for the current question
            const answers = await loadAnswers(currentQuestion.id);
            
            // Mélanger les réponses
            const shuffledAnswers = shuffleArray(answers);
            
            shuffledAnswers.forEach(answer => {
                const answerButton = document.createElement('button');
                answerButton.className = 'answer-button w-full text-left p-4';
                answerButton.id = `answer-${answer.answer_id}`; // Set unique ID using answer_id
                answerButton.innerHTML = `
                    <div class="flex items-center">
                        <span class="text-lg">${answer.answer_text}</span>
                    </div>
                `;
                
                // Stocker si la réponse est correcte dans un attribut data
                answerButton.dataset.correct = answer.is_correct;
                console.log('answerButton.dataset.correct:', answer.is_correct);
                
                // Ajouter l'écouteur d'événement pour appeler handleAnswer au clic
               answerButton.addEventListener('click', () => handleAnswer(answer.answer_id, answer.is_correct, answerButton));
                answersContainer.appendChild(answerButton);
            });
        } catch (error) {
            console.error('Error loading answers:', error);
            showFeedback('Impossible de charger les réponses', 'error');
        }
        
        // Réinitialiser l'état
        hasAnswered = false;
        const nextButton = document.getElementById('next-question-btn');
        if (nextButton) {
            nextButton.disabled = true;
            nextButton.classList.remove('hover:scale-105');
        }
    } else {
        showQuizComplete();
    }
}

// Gestion des réponses
function handleAnswer(answerId, isCorrect, button) {
    console.log('Answer selected:', answerId, 'Correct:', isCorrect);
    if (hasAnswered) return;
    hasAnswered = true;
    
    const buttons = document.querySelectorAll('.answer-button');
    buttons.forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
    
    // Animation de sélection
    button.classList.add('animate__animated', 'animate__pulse');
    
    setTimeout(() => {
        buttons.forEach(btn => {
            if (btn.dataset.correct === "1") {
                btn.classList.add('correct', 'animate__animated', 'animate__bounceIn');
            } else if (btn === button && !isCorrect) {
                btn.classList.add('wrong', 'animate__animated', 'animate__shakeX');
            }
        });
        
        // Afficher le feedback et mettre à jour le score

        if (isCorrect==1) {
            showFeedback('Bonne réponse ! 🎉');
            createConfetti();
            updateScore(10); // +10 points pour une bonne réponse
            
            // Incrémenter le compteur de bonnes réponses
            const correctAnswers = document.getElementById('correct-answers');
            correctAnswers.textContent = parseInt(correctAnswers.textContent) + 1;
        } else {
            showFeedback('Mauvaise réponse 😕', 'error');
            updateScore(-1); // -1 point pour une mauvaise réponse
        }
        
        // Activer le bouton suivant
        const nextButton = document.getElementById('next-question-btn');
        if (nextButton) {
            nextButton.disabled = false;
            nextButton.classList.add('animate__animated', 'animate__bounceIn');
            nextButton.addEventListener('click', () => {
                currentQuestionIndex++;
                console.log('Showing next question... 319');
                showQuestion();
            }, { once: true });
        }
    }, 1000);
}

function showQuizComplete() {
    console.log('Showing quiz complete...');
    const container = document.querySelector('.lg\\:col-span-2 > div');
    if (container) {
        container.innerHTML = `
            <div class="text-center py-12 animate__animated animate__fadeIn">
                <div class="text-6xl mb-8 animate__animated animate__bounceIn">🎉</div>
                <h2 class="text-3xl font-bold gradient-text mb-4">Quiz Terminé !</h2>
                <p class="text-gray-600 mb-8">Félicitations ! Vous avez complété toutes les questions.</p>
                <button onclick="location.reload()" 
                        class="bg-gradient-to-r from-primary to-secondary text-white px-8 py-4 rounded-xl font-semibold 
                        transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                    Recommencer
                </button>
            </div>
        `;
        
        createConfetti();
    }
}

function createConfetti() {
    console.log('Creating confetti...');
    const confetti = document.createElement('div');
    confetti.className = 'fixed inset-0 pointer-events-none z-50';
    
    for (let i = 0; i < 100; i++) {
        const particle = document.createElement('div');
        particle.className = 'absolute w-2 h-2 rounded-full';
        particle.style.backgroundColor = ['#4F46E5', '#7C3AED', '#F59E0B'][Math.floor(Math.random() * 3)];
        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.top = '-10px';
        particle.style.transform = `rotate(${Math.random() * 360}deg)`;
        particle.style.animation = `fall ${1 + Math.random() * 2}s linear forwards`;
        confetti.appendChild(particle);
    }
    
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 3000);
}

function showFeedback(message, type = 'info') {
    console.log('Showing feedback:', message);
    const feedbackContainer = document.getElementById('feedback-container');
    const feedback = document.createElement('div');
    feedback.className = `feedback ${type}`;
    feedback.textContent = message;
    
    feedbackContainer.appendChild(feedback);
    
    setTimeout(() => {
        feedback.style.transform = 'translateX(100%)';
        setTimeout(() => {
            feedbackContainer.removeChild(feedback);
        }, 300);
    }, 3000);
}

function updateScore(points) {
    console.log('Updating score by:', points);
    if (points === 0) {
        console.warn('No points to update');
        return;
    }
    const totalPoints = document.getElementById('total-points');
    const currentPoints = parseInt(totalPoints.textContent);
    const newPoints =currentPoints + points; // Empêcher le score d'aller en dessous de 0
    
    // Animation du score
    let count = currentPoints;
    const duration = 1000;
    const step = points / (duration / 16);
    
    function updateCounter() {
        count += step;
        if ((step > 0 && count >= newPoints) || (step < 0 && count <= newPoints)) {
            count = newPoints;
            totalPoints.textContent = Math.round(count);
            return;
        }
        totalPoints.textContent = Math.round(count);
        requestAnimationFrame(updateCounter);
    }
    
    requestAnimationFrame(updateCounter);
    
    // Mise à jour de la barre de progression
    const progressBar = document.getElementById('rewards-progress-bar');
    const percentage = (newPoints / MAX_POINTS) * 100;
    progressBar.style.width = percentage + '%';
    
    // Mise à jour du texte de progression
    const progressText = document.getElementById('rewards-progress-text');
    progressText.textContent = `${newPoints}/${MAX_POINTS} points`;
    
    // Effet visuel pour les points perdus
    if (points < 0) {
        const pointsLost = document.createElement('div');
        pointsLost.className = 'points-lost animate__animated animate__fadeOutUp';
        pointsLost.textContent = points;
        document.body.appendChild(pointsLost);
        
        setTimeout(() => {
            document.body.removeChild(pointsLost);
        }, 1000);
    }
}

function updateRewardsProgress(currentPoints) {
    console.log('Updating rewards progress...');
    const progressBar = document.getElementById('rewards-progress-bar');
    const progressText = document.getElementById('rewards-progress-text');
    const rewardsContainer = document.getElementById('rewards-container');
    
    if (!progressBar || !progressText || !rewardsContainer || !tickets.length) return;

    const sortedTickets = [...tickets].sort((a, b) => a.points_required - b.points_required);
    
    const currentTicket = sortedTickets.filter(t => currentPoints >= t.points_required).pop() || sortedTickets[0];
    const nextTicketIndex = sortedTickets.findIndex(t => t.id === currentTicket.id) + 1;
    const nextTicket = nextTicketIndex < sortedTickets.length ? sortedTickets[nextTicketIndex] : null;
    
    let progressPercentage;
    if (!nextTicket) {
        progressPercentage = 100;
    } else {
        const previousTicketPoints = currentTicket.points_required;
        const pointsInCurrentLevel = currentPoints - previousTicketPoints;
        const pointsNeededForNextLevel = nextTicket.points_required - previousTicketPoints;
        progressPercentage = Math.min((pointsInCurrentLevel / pointsNeededForNextLevel) * 100, 100);
    }

    progressBar.style.width = `${progressPercentage}%`;
    
    if (!nextTicket) {
        progressText.textContent = `Niveau Maximum Atteint! (${currentPoints} points)`;
    } else {
        const pointsNeeded = nextTicket.points_required - currentPoints;
        progressText.textContent = `${pointsNeeded} points pour ${nextTicket.name}`;
    }

    rewardsContainer.innerHTML = sortedTickets.map(ticket => `
        <div class="reward-item ${currentPoints >= ticket.points_required ? 'opacity-100' : 'opacity-50'} 
                    flex items-center space-x-2 p-2 rounded-lg transition-all duration-300">
            <span class="text-2xl">${getTicketIcon(ticket.name)}</span>
            <div class="flex flex-col">
                <span class="font-semibold">${ticket.name}</span>
                <span class="text-sm text-gray-500">${ticket.points_required} pts</span>
            </div>
        </div>
    `).join('');

    progressBar.style.transition = 'width 1s ease-in-out';
}

function getTicketIcon(ticketName) {
    const icons = {
        'Bronze': '🥉',
        'Argent': '🥈',
        'Or': '🥇',
        'Platine': '💎',
        'Diamant': '💫',
    };
    return icons[ticketName] || '🎫';
}

async function loadRewards() {
    try {
        const response = await axios.get('https://ayoba-yamo-quizz.zen-apps.com/api/index.php/?lang=${preferredLang}&endpoint=get_all_tickets');
        const rewards = response.data;
        const rewardsContainer = document.getElementById('rewards-container');
        rewardsContainer.innerHTML = ''; // Clear previous rewards
        
        rewards.forEach(reward => {
            const rewardElement = document.createElement('div');
            rewardElement.className = 'reward-item p-4 border-b';
            rewardElement.innerHTML = `
                <h3 class="text-xl font-bold">${reward.name}</h3>
                <p>Points Required: ${reward.points_required}</p>
                <p>Reward: ${reward.reward}</p>
                <p>Quantity: ${reward.quantity}</p>
                <p>Expiration Date: ${reward.expiration_date || 'No expiration'}</p>
            `;
            rewardsContainer.appendChild(rewardElement);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des récompenses:', error);
    }
}

function addRewardMarkers(rewards, totalPoints) {
    const progressBar = document.getElementById('rewards-progress-bar');
    const progressContainer = progressBar.parentElement;

    rewards.forEach(reward => {
        const marker = document.createElement('div');
        marker.className = 'reward-marker';
        marker.style.position = 'absolute';
        marker.style.top = '-10px';
        marker.style.width = '20px';
        marker.style.height = '20px';
        marker.style.backgroundColor = 'transparent';
        marker.style.borderRadius = '50%';

        const positionPercentage = (reward.points_required / totalPoints) * 100;
        marker.style.left = `calc(${positionPercentage}% - 10px)`; // Center the marker

        const icon = document.createElement('span');
        icon.className = 'reward-icon';
        icon.innerHTML = getRewardIcon(reward.reward); // Assuming a function that maps rewards to icons
        marker.appendChild(icon);

        progressContainer.appendChild(marker);
    });
}

function getRewardIcon(rewardName) {
    const icons = {
        'Special Badge': '🏅',
        'Premium Access': '👑',
        'Exclusive Content': '⭐'
    };
    return icons[rewardName] || '🎁';
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Document loaded...');
    initializeUI();
    loadRewards();
    loadTickets().then(tickets => {
        addRewardMarkers(tickets, 500);
    });
});
