let socket;
let columns = 100,
    rows = 1; // 처음엔 1개의 row만 존재
let cellSize = 50;
let nodeCounter = 1;
let subIdMap = {}; // 각 ID마다 SubID를 관리하는 객체
let selectedNode = null; // 기준 노드를 저장하는 변수
let isNodeAdditionMode = false; // 노드 추가 생성 모드 상태
let zIndexCounter = 10000; // 초기 z-index 값을 10000으로 설정

let nodes = [];
let rowIdCounter = 1; // row ID를 위한 전역 카운터
let subArtifactCounters = {}; // 각 Main Artifact에 대한 Sub Artifact 카운터
let popupContent;

const neonColors = [
    "#FF6FFF",
    "#39FF14",
    "#FF073A",
    "#7DF9FF",
    "#FFD700",
    "#FF1493",
    "#ADFF2F",
];

let colorIndex = 0; // 색상 배열의 인덱스를 추적하는 변수

// 순서대로 네온 컬러를 할당하는 함수
function getNextNeonColor() {
    const color = neonColors[colorIndex]; // 현재 인덱스의 색상 할당
    colorIndex = (colorIndex + 1) % neonColors.length; // 인덱스가 배열의 끝에 도달하면 다시 0으로
    return color;
}

window.addEventListener("contextmenu", handleContextMenu);
window.addEventListener("resize", updateInteractionBendsPosition);

function draw() {
    background("#1E1E1E");
    drawGrid();

    nodes.forEach((node) => {
        const isMouseOver = dist(mouseX, mouseY, node.x, node.y) < 10;

        if (node.isDiamond) {
            // 마름모 모양 그리기
            fill(node.color);
            noStroke();
            beginShape();
            vertex(node.x, node.y - 5);
            vertex(node.x + 5, node.y);
            vertex(node.x, node.y + 5);
            vertex(node.x - 5, node.y);
            endShape(CLOSE);
        } else {
            // 기존 동그라미 모양 그리기
            if (!node.hasText) {
                fill("#1E1E1E");
                stroke(node.color);
                strokeWeight(2);
                ellipse(node.x, node.y, 10, 10);
            } else {
                fill(node.color);
                noStroke();
                ellipse(node.x, node.y, 10, 10);
            }
        }

        if (isMouseOver && node.hasText) {
            node.interactionBand.style.visibility = "visible";
        } else if (node.hasText) {
            node.interactionBand.style.visibility = "hidden";
        }

        updateInteractionBandPosition(node);
    });

    // 연결선을 그리는 로직은 동일하게 유지
    const groupedNodes = {};
    nodes.forEach((node) => {
        if (!groupedNodes[node.id]) {
            groupedNodes[node.id] = [];
        }
        groupedNodes[node.id].push(node);
    });

    Object.values(groupedNodes).forEach((group) => {
        group.sort((a, b) => a.subid - b.subid);

        for (let i = 0; i < group.length - 1; i++) {
            const node1 = group[i];
            const node2 = group[i + 1];
            stroke(node1.color);
            line(node1.x, node1.y, node2.x, node2.y);
        }
    });
}

// 오른쪽 클릭 메뉴 처리 함수
function handleContextMenu(event) {
    event.preventDefault();
    const clickX = event.clientX;
    const clickY = event.clientY;
    const target = event.target; // 우클릭한 요소 확인

    // ✅ + 버튼을 우클릭한 경우
    if (target.classList.contains("add-row-button")) {
        showPlusButtonContextMenu(clickX, clickY, target);
        return;
    }

    // ✅ 노드를 우클릭한 경우
    const clickedNode = nodes.find(
        (node) => dist(mouseX, mouseY, node.x, node.y) < 10
    );

    if (clickedNode) {
        showContextMenu(clickX, clickY, clickedNode);
    }
}

function addNewRow(isSubArtifact = false, description = "", parentId = null) {
    const rowContainer = document.createElement("div");
    rowContainer.className = "artifact-row";

    let currentId;
    if (isSubArtifact && parentId) {
        if (!subArtifactCounters[parentId]) {
            subArtifactCounters[parentId] = 0;
        }
        const alphabet = String.fromCharCode(97 + subArtifactCounters[parentId]);
        currentId = `${parentId}${alphabet}`;
        subArtifactCounters[parentId]++;
    } else {
        currentId = `${rowIdCounter}`;
        subArtifactCounters[currentId] = 0;
        rowIdCounter++;
    }

    rowContainer.id = `artifact-row-${currentId}`;
    rowContainer.style.zIndex = zIndexCounter;
    zIndexCounter--;

    const artifactBox = document.createElement("div");
    artifactBox.className = isSubArtifact ? "sub-artifact" : "main-artifact";
    artifactBox.textContent = description || (isSubArtifact ? `New Sub Artifact (${currentId})` : `New Main Artifact (${currentId})`);

    artifactBox.style.backgroundColor = isSubArtifact ? "#2e2e2e" : "#2b2b2b";
    artifactBox.style.color = "#f1f1f1";
    artifactBox.style.border = "1px solid #555";
    artifactBox.style.borderRadius = "8px";
    artifactBox.style.padding = "12px";
    artifactBox.style.marginRight = "5px";
    artifactBox.style.boxShadow = "0px 4px 10px rgba(0, 0, 0, 0.3)";

    if (isSubArtifact) {
        artifactBox.style.marginLeft = "20px";
        artifactBox.style.borderLeft = "2px solid #888";
        artifactBox.style.fontSize = "14px";
    }

    rowContainer.appendChild(artifactBox);
    addDoubleClickToEdit(artifactBox);

    const addButton = document.createElement("button");
    addButton.className = "add-row-button";
    addButton.textContent = "+";

    addButton.style.marginLeft = "5px";
    addButton.style.width = "40px";
    addButton.style.height = "40px";
    addButton.style.padding = "10px";
    addButton.style.backgroundColor = "#464646";
    addButton.style.color = "white";
    addButton.style.border = "none";
    addButton.style.borderRadius = "4px";
    addButton.style.cursor = "pointer";

    addButton.addEventListener("click", (event) => {
        event.stopImmediatePropagation();
        addNewRow(false, "", currentId);
    });

    addButton.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        showPlusButtonContextMenu(event.clientX, event.clientY, addButton, currentId);
    });

    rowContainer.appendChild(addButton);

    if (parentId) {
        const parentRow = document.getElementById(`artifact-row-${parentId}`);
        if (parentRow) {
            parentRow.insertAdjacentElement("afterend", rowContainer);
        } else {
            document
                .getElementById("artifact-container")
                .insertBefore(rowContainer, document.getElementById("row-control-container"));
        }
    } else {
        document
            .getElementById("artifact-container")
            .insertBefore(rowContainer, document.getElementById("row-control-container"));
    }

    console.log(`✅ Created ${isSubArtifact ? "Sub Artifact" : "Main Artifact"} (ID: ${currentId}): ${description || ""}`);

    rows++;
    resizeCanvas(columns * cellSize, rows * cellSize);
    const artifactContainer = document.getElementById("artifact-container");
    artifactContainer.style.height = `${rows * cellSize}px`;
}

function showPlusButtonContextMenu(x, y, addButton) {
    // ✅ 기존 메뉴 제거
    const existingMenu = document.getElementById("context-menu");
    if (existingMenu) {
        existingMenu.remove();
    }

    // ✅ 메뉴 생성
    const menu = document.createElement("div");
    menu.id = "context-menu";
    menu.style.position = "absolute";
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.backgroundColor = "#1e1e1e";
    menu.style.border = "1px solid #555";
    menu.style.padding = "10px";
    menu.style.borderRadius = "8px";
    menu.style.boxShadow = "0px 4px 8px rgba(0, 0, 0, 0.3)";
    menu.style.zIndex = "9999";

    // ✅ Add Sub Artifact 옵션
    const addSubArtifactOption = document.createElement("div");
    addSubArtifactOption.innerText = "Add Sub Artifact";
    addSubArtifactOption.style.cursor = "pointer";
    addSubArtifactOption.style.color = "#FFFFFF";
    addSubArtifactOption.style.padding = "5px 10px";

    // ✅ Main Artifact ID 가져오기
    const parentRow = addButton.closest(".artifact-row");
    const parentId = parentRow ? parentRow.id.replace("artifact-row-", "") : null;

    addSubArtifactOption.addEventListener("click", () => {
        if (parentId) {
            addNewRow(true, "", parentId); // ✅ parentId 전달
        } else {
            console.warn("Parent ID not found for Sub Artifact creation.");
        }
        menu.remove();
    });

    menu.appendChild(addSubArtifactOption);
    document.body.appendChild(menu);

    // ✅ 메뉴 외부 클릭 시 닫기
    document.addEventListener("click", (event) => {
        if (!menu.contains(event.target)) {
            menu.remove();
        }
    }, { once: true });
}

// 더블클릭하여 텍스트 입력을 활성화하는 함수
function addDoubleClickToEdit(element) {
    element.addEventListener("dblclick", function () {
        // 기존 div를 텍스트 입력 박스로 변경
        const input = document.createElement("input");
        input.type = "text";
        input.className = element.className;
        input.style.width = "100%"; // 입력 필드 너비 설정
        input.value = element.textContent.trim(); // 기존 내용 로드
        element.replaceWith(input);
        input.focus();

        // 입력 저장 및 수정 완료
        input.addEventListener("blur", function () {
            const newText = input.value.trim();
            element.textContent = newText || ""; // 입력 값이 없으면 빈 텍스트로 저장
            input.replaceWith(element);
            console.log(`Updated ${element.className}: ${newText}`);
        });

        // Enter 키로 입력 저장 및 수정 완료
        input.addEventListener("keypress", function (event) {
            if (event.key === "Enter") {
                input.blur(); // 포커스를 잃어 blur 이벤트로 저장
            }
        });
    });
}

// 오른쪽 클릭 메뉴 표시 함수
function showContextMenu(x, y, node) {
    const menu = document.createElement("div");
    menu.style.position = "absolute";
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.backgroundColor = "#1e1e1e"; // 배경색을 #1e1e1e로 설정
    menu.style.border = "1px solid #CCC";
    menu.style.padding = "10px";
    menu.style.borderRadius = "8px"; // 상자에 round 모서리 적용
    menu.style.boxShadow = "0px 4px 8px rgba(0, 0, 0, 0.2)"; // 약간의 그림자 효과 추가

    // generate next node 옵션
    const generateNextNodeOption = document.createElement("div");
    generateNextNodeOption.innerText = "Generate next node";
    generateNextNodeOption.style.cursor = "pointer";
    generateNextNodeOption.style.color = "#FFFFFF"; // 텍스트 색상을 흰색으로 설정
    generateNextNodeOption.style.padding = "5px 10px"; // 내부 패딩 추가
    generateNextNodeOption.style.borderBottom = "1px solid #555"; // 옵션 간 구분선 추가
    generateNextNodeOption.addEventListener("click", () => {
        enterNodeAdditionMode(node);
        document.body.removeChild(menu);
    });

    menu.appendChild(generateNextNodeOption);

    // add interaction bend 옵션 추가 (조건: fill 색상이 #1e1e1e일 때만)
    if (node.color === "#1e1e1e") {
        const addInteractionBendOption = document.createElement("div");
        addInteractionBendOption.innerText = "Add interaction bend";
        addInteractionBendOption.style.cursor = "pointer";
        addInteractionBendOption.style.color = "#FFFFFF"; // 텍스트 색상을 흰색으로 설정
        addInteractionBendOption.style.padding = "5px 10px"; // 내부 패딩 추가

        addInteractionBendOption.addEventListener("click", () => {
            // 여기에 인터랙션 밴드를 추가하는 로직을 넣습니다.
            node.hasText = true; // 노드에 텍스트가 추가됨을 표시
            node.interactionBand.style.visibility = "visible"; // 인터랙션 밴드 보이기
            document.body.removeChild(menu);
        });

        menu.appendChild(addInteractionBendOption);
    }

    // delete node 옵션
    const deleteNodeOption = document.createElement("div");
    deleteNodeOption.innerText = "Delete node";
    deleteNodeOption.style.cursor = "pointer";
    deleteNodeOption.style.color = "#FFFFFF"; // 텍스트 색상을 흰색으로 설정
    deleteNodeOption.style.padding = "5px 10px"; // 내부 패딩 추가

    deleteNodeOption.addEventListener("click", () => {
        deleteNode(node); // 노드 삭제 함수 호출
        document.body.removeChild(menu);
    });

    menu.appendChild(deleteNodeOption);
    document.body.appendChild(menu);

    document.addEventListener("click", () => {
        if (document.body.contains(menu)) {
            document.body.removeChild(menu);
        }
    });
}

function deleteNode(node) {
    // 기준 노드(subid가 1인 경우) 삭제 시 해당 UserDescr도 삭제
    if (node.subid === 1) {
        const userDescrElement = document.getElementById("userDescr");
        if (userDescrElement) {
            const descrToRemove = Array.from(userDescrElement.children).find((descr) =>
                descr.textContent.includes(`ID: ${node.id}`)
            );
            if (descrToRemove) {
                userDescrElement.removeChild(descrToRemove);
                console.log(`Removed user description for Node ID: ${node.id}`);
            }
        }
    }

    // 노드 목록에서 해당 노드 제거
    nodes = nodes.filter((n) => !(n.id === node.id && n.subid === node.subid));

    // DOM에서 인터랙션 밴드 제거
    if (node.interactionBand && node.interactionBand.parentNode) {
        document.body.removeChild(node.interactionBand);
    }

    socket.emit("delete node", node);
    redraw();
}

function enterNodeAdditionMode(node) {
    isNodeAdditionMode = true;
    selectedNode = node;
    console.log(`Entered Node Addition Mode for Node ID: ${node.id}`);
}

function doubleClicked() {
    if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
        const gridX = floor(mouseX / cellSize) * cellSize + cellSize / 2;
        const gridY = floor(mouseY / cellSize) * cellSize + cellSize / 2;

        if (isNodeAdditionMode && selectedNode) {
            const nodeColor = selectedNode.color;

            let subId;
            if (subIdMap[selectedNode.id]) {
                subId = Math.max(...subIdMap[selectedNode.id]) + 1;
            } else {
                subIdMap[selectedNode.id] = [];
                subId = 1;
            }

            subIdMap[selectedNode.id].push(subId);

            const newNode = createNodeWithInteractionBand(
                gridX,
                gridY,
                nodeColor,
                "",
                selectedNode.id,
                subId
            );
            nodes.push(newNode);

            socket.emit("new node", newNode);
            exitNodeAdditionMode();
        } else {
            const nodeColor = getNextNeonColor();
            const nodeId = nodeCounter++;
            subIdMap[nodeId] = [1];

            const newNode = createNodeWithInteractionBand(
                gridX,
                gridY,
                nodeColor,
                "",
                nodeId,
                null
            );
            nodes.push(newNode);

            socket.emit("new node", newNode);

            // 사용자 설명 추가
            createUserDescr(nodeColor, nodeId);
        }
    }
}

// 사용자 설명을 표시하고 특정 column에 노드를 배치하는 함수
function createUserDescr(color, id, userName = "User") {
    let userDescr = document.getElementById("userDescr");

    if (!userDescr) {
        userDescr = document.createElement("div");
        userDescr.id = "userDescr";
        userDescr.style.position = "absolute";
        userDescr.style.right = "20px";
        userDescr.style.bottom = "10px";
        userDescr.style.backgroundColor = "#1e1e1e";
        userDescr.style.color = "#FFFFFF";
        userDescr.style.padding = "10px";
        userDescr.style.borderRadius = "8px";
        userDescr.style.border = "1px solid #CCC";
        userDescr.style.zIndex = "9999";
        userDescr.style.maxHeight = "300px";
        userDescr.style.overflowY = "auto";
        document.body.appendChild(userDescr);
    }

    const newDescr = document.createElement("div");
    newDescr.style.marginBottom = "10px";

    // 사용자 설명에 'User [id]' 형식으로 표시
    const nodeName = document.createElement("span");
    nodeName.textContent = `${userName} [${id}]`;  // 'User [id]' 형식으로 표시
    nodeName.style.cursor = "pointer";
    nodeName.style.display = "block";
    nodeName.style.color = color;

    // 더블 클릭으로 이름 편집 가능
    nodeName.addEventListener("dblclick", function () {
        const input = document.createElement("input");
        input.type = "text";
        input.value = nodeName.textContent;
        input.style.color = color;

        input.addEventListener("keypress", function (event) {
            if (event.key === "Enter") {
                nodeName.textContent = input.value || `User [${id}]`;  // 기본 형식 유지
                input.replaceWith(nodeName);
            }
        });

        nodeName.replaceWith(input);
        input.focus();
    });

    newDescr.appendChild(nodeName);
    userDescr.appendChild(newDescr);

    console.log(
        `Added user info - Name: ${userName} [${id}], Color: ${color}`
    );
}

// 노드 추가 생성 모드 종료 함수
function exitNodeAdditionMode() {
    isNodeAdditionMode = false;
    selectedNode = null;
    console.log("Exited Node Addition Mode");
}

function createNodeWithInteractionBand(x, y, color, description, id, subid, isDiamond = false) {
    const interactionBand = createInteractionBand(x, y, color);

    const node = {
        id: id,
        subid: subid,
        x: x,
        y: y,
        color: color,
        description: description,
        interactionBand: interactionBand,
        hasText: false,
        isDiamond: isDiamond // 마름모 모양 여부를 저장
    };

    interactionBand.focus();

    interactionBand.addEventListener("blur", function () {
        if (interactionBand.value.trim() === "") {
            if (interactionBand.parentNode) {
                document.body.removeChild(interactionBand);
            }
            node.hasText = false;
        } else {
            node.hasText = true;
            interactionBand.style.visibility = "hidden";
        }
    });

    return node;
}

function createInteractionBand(x, y, color) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "interaction-bend";
    input.id = `interaction-band-${Date.now()}`;

    const canvasPosition = document
        .querySelector("canvas")
        .getBoundingClientRect();
    const initialWidth = 120;
    input.style.position = "absolute";
    input.style.left = `${canvasPosition.left + x - initialWidth / 2}px`;
    input.style.top = `${canvasPosition.top + y - 10}px`;
    input.style.width = `${initialWidth}px`;
    input.style.backgroundColor = "#464646";
    input.style.color = "#FFFFFF";
    input.style.border = `2px solid ${color}`;
    input.placeholder = "Enter description...";

    input.focus();

    // 포커스를 벗어날 때 빈 텍스트 박스는 제거
    input.addEventListener("blur", function () {
        if (input.value.trim() === "" && input.parentNode) {
            // 부모 노드가 존재하는지 확인
            document.body.removeChild(input); // 입력값이 없으면 자동 제거
        }
    });

    // Enter 키 입력 시 길이를 조절하고 포커스를 해제하여 입력 확정
    input.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            socket.emit("node description", { x, y, description: input.value });
            adjustWidthToTextLength(input);
            input.blur(); // 포커스 해제
        }
    });

    document.body.appendChild(input);
    return input;
}

// 문자열 길이에 맞게 width를 조정하는 함수
function adjustWidthToTextLength(input) {
    const textLength = input.value.length;
    const charWidth = 10; // 문자의 평균 너비(px 단위)
    const padding = 20; // 양쪽 여백을 고려한 패딩

    // 총 너비를 계산하고 input의 폭을 설정
    const newWidth = textLength * charWidth + padding;
    input.style.width = `${newWidth}px`;
}

// 창 크기 조정 시 인터랙션 밴드 위치 업데이트
function updateInteractionBendsPosition() {
    nodes.forEach((node) => {
        updateInteractionBandPosition(node);
    });
}

// 각 노드에 맞춰 인터랙션 밴드 위치 업데이트
function updateInteractionBandPosition(node) {
    const canvasPosition = document
        .querySelector("canvas")
        .getBoundingClientRect();
    node.interactionBand.style.left = `${canvasPosition.left + node.x + 10}px`;
    node.interactionBand.style.top = `${canvasPosition.top + node.y - 10}px`;
}

// 그리드 그리기 함수
function drawGrid() {
    stroke("#FFFFFF");
    strokeWeight(1);

    // 기본 그리드 선
    for (let x = 0; x <= width; x += cellSize) {
        line(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += cellSize) {
        line(0, y, width, y);
    }

    // 점선 스타일 설정
    drawingContext.setLineDash([5, 5]); // 점선의 길이와 간격 설정

    // 중간에 점선 추가
    stroke("#666666"); // 점선의 색상 설정 (회색)
    for (let x = cellSize / 2; x <= width; x += cellSize) {
        line(x, 0, x, height); // 세로 점선
    }
    for (let y = cellSize / 2; y <= height; y += cellSize) {
        line(0, y, width, y); // 가로 점선
    }

    // 점선 스타일 초기화
    drawingContext.setLineDash([]);
}

document.addEventListener("DOMContentLoaded", function () {
    socket = io(); // Socket.IO 연결을 설정

    document
        .getElementById("add-row-button")
        .addEventListener("click", () => addNewRow(false));

    // 로딩 스피너를 보여주고 숨기는 함수
    function showLoadingSpinner(message) {
        const spinnerContainer = document.getElementById(
            "loading-spinner-container"
        );
        const loadingMessage = document.getElementById("loading-message");
        spinnerContainer.style.display = "block"; // 스피너 표시
        loadingMessage.innerText = message; // 현재 상태 메시지 표시
    }
    function hideLoadingSpinner() {
        const spinnerContainer = document.getElementById(
            "loading-spinner-container"
        );
        spinnerContainer.style.display = "none"; // 스피너 숨기기
    }

    /** 🔄 OpenAI API 호출
     * @param {string} prompt - OpenAI API에 보낼 프롬프트 텍스트 */
    function askOpenAI(prompt) {
        console.log("Client sent prompt:", prompt);
        socket.emit("scenarioPrompting", { prompt: prompt });
        showLoadingSpinner("시나리오 텍스트 생성 중");
    }
    /**
     * 🔄 scenarioMakingPrompt.json 파일을 가져오기
     * @returns {Promise<string>} JSON 파일의 내용을 반환 */
    async function fetchScenarioPrompt() {
        try {
            const response = await fetch('/scenarioMakingPrompt.json');
            if (!response.ok) throw new Error('Failed to load scenarioMakingPrompt.json');

            const jsonData = await response.json();
            console.log("✅ Loaded scenarioMakingPrompt.json:", jsonData);
            return JSON.stringify(jsonData); // JSON을 문자열로 변환하여 반환
        } catch (error) {
            console.error("❌ Error loading scenarioMakingPrompt.json:", error);
            hideLoadingSpinner();
            return null;
        }
    }

    //✅ 서버로부터 시나리오 OpenAI 응답을 받음
    socket.on("scenario response", (data) => {
        if (data.response) {
            console.log("✅ scenario response:", data.response);
            addScenarioToTextBox(data.response);
            hideLoadingSpinner(); // 성공 시 스피너 숨김
        } else if (data.error) {
            console.error("❌ Frontend error during scenario prompt:", data.error);
            hideLoadingSpinner(); // 에러 발생 시 스피너 숨김
        }
    });

    // ✅ OpenAI API 호출 및 scenarioMakingPrompt.json 사용
    async function handleSaveAndPrompt() {
        // 📝 scenarioMakingPrompt.json 불러오기
        const scenarioPrompt = await fetchScenarioPrompt();
        if (!scenarioPrompt) {
            alert("scenarioMakingPrompt.json 파일을 불러오는 데 실패했습니다.");
            return;
        }

        // 🔄 OpenAI API 호출
        askOpenAI(scenarioPrompt);

        // 🔄 JSON 파일 서버로 업데이트
        try {
            const response = await fetch('/update-json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: scenarioPrompt
            });

            if (response.ok) {
                console.log("✅ JSON 파일이 성공적으로 저장되었습니다.");
            } else {
                console.error("❌ JSON 파일 저장 실패:", response.statusText);
            }
        } catch (error) {
            console.error("❌ JSON 저장 오류:", error);
        }
    }

    // ✅ 단계별 텍스트 저장 변수
    let step1Text = '';
    let step2Text = '';
    let step3Text = '';

    /**
 * ✅ OpenAI 응답을 팝업 창에 표시하는 함수
 * @param {string} response - OpenAI API의 응답 텍스트
 */
    function addScenarioToTextBox(response) {
        const popup = document.getElementById('scenario-popup');
        const scenarioText = document.getElementById('scenario-text');
        const scenarioImage = document.getElementById('scenario-image-display');
        const closeButton = document.getElementById('close-popup-button');
        const copyButton = document.getElementById('copy-popup-button');

        // ✅ 텍스트 영역에 응답 추가
        scenarioText.innerText = response;

        // ✅ 팝업 표시
        popup.style.display = 'flex';

        // ✅ 팝업 닫기 버튼 이벤트 리스너
        closeButton.addEventListener('click', () => {
            popup.style.display = 'none';
        });

        // ✅ 복사 버튼 이벤트 리스너
        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(response)
                .then(() => {
                    console.log('✅ 텍스트가 클립보드에 복사되었습니다.');
                    alert('✅ 텍스트가 복사되었습니다.');
                })
                .catch(err => {
                    console.error('❌ 복사 중 오류 발생:', err);
                });
        });

        // ✅ JSON 자동 변환 실행
        console.log('🔄 Automatically converting response to JSON...');
        convertImagePromptToJson(response);
    }

    /**
     * ✅ response를 JSON 형식으로 변환
     * @param {string} response - 팝업 창에 표시된 텍스트
     */
    function convertImagePromptToJson(response) {
        console.log('📦 Converting response to JSON...');

        const sentences = response.split('.').filter(sentence => sentence.trim() !== '');
        const stepCount = 3; // ✅ 단계 수를 3개로 변경
        const stepSize = Math.ceil(sentences.length / stepCount);

        // ✅ 3단계로 나누기
        let step1Text = sentences.slice(0, stepSize).join('. ') + '.';
        let step2Text = sentences.slice(stepSize, stepSize * 2).join('. ') + '.';
        let step3Text = sentences.slice(stepSize * 2).join('. ') + '.';

        const jsonObject = {
            step1Text,
            step2Text,
            step3Text
        };

        console.log('✅ JSON Conversion Complete:', jsonObject);
        alert('✅ response가 JSON 형식으로 변환되었습니다. 콘솔을 확인하세요.');

        // ✅ 서버로 전송
        console.log('📤 Sending JSON data to server...');
        socket.emit('generateImage', jsonObject);
    }

    /**
     * ✅ Progress Bar 업데이트 함수
     * @param {number} progress - 진행 상황 (0~100)
     */
    function updateProgressBar(progress) {
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        } else {
            console.error('❌ Progress bar element not found.');
        }
    }

    /**
 * ✅ 서버로부터 이미지 URL 수신
 */
socket.on('image response', ({ imageUrls, error }) => {
    const popup = document.getElementById('scenario-popup');
    const progressContainer = document.getElementById('progress-container');

    if (!popup) {
        console.error('❌ Popup element not found.');
        return;
    }

    if (error) {
        console.error('❌ Image Generation Error:', error);
        alert('❌ 이미지 생성 중 오류가 발생했습니다.');
        return;
    }

    console.log('✅ Received Image URLs:', imageUrls);

    // ✅ Progress Bar 초기화
    if (progressContainer) {
        progressContainer.style.display = 'block';
        updateProgressBar(0);
    }

    // ✅ 이미지 로드 및 표시
    imageUrls.forEach(({ step, imageUrl }, index) => {
        setTimeout(() => {
            // ✅ 단계별 DOM 요소 확인
            const imgElement = document.querySelector(`#scenario-image-${step}`);
            const descElement = document.querySelector(`#scenario-image-${step} + p`);

            console.log(`🔍 Checking Step ${step}:`, imgElement, descElement);

            if (imgElement && descElement) {
                imgElement.src = imageUrl;
                imgElement.alt = `Generated Image ${step}`;
                descElement.textContent = `Step ${step}`;

                console.log(`✅ Image and Description updated for Step ${step}`);
            } else {
                console.warn(`⚠️ Missing Image or Description element for Step ${step}`);
            }

            // ✅ Progress Bar 업데이트
            const progress = ((index + 1) / imageUrls.length) * 100;
            updateProgressBar(progress);

            if (index === imageUrls.length - 1) {
                setTimeout(() => {
                    if (progressContainer) {
                        progressContainer.style.display = 'none';
                    }
                }, 500);
            }
        }, index * 1500); // 단계별로 약간의 시간차를 둠
    });

    // ✅ 팝업 표시
    popup.style.display = 'flex';
});

    // 🖱️ save json button 클릭 이벤트
    document.getElementById("save-json-button").addEventListener("click", async function () {
        console.log("✅ Save button clicked. Starting OpenAI API call and JSON update...");
        await handleSaveAndPrompt();
    });

    document.getElementById('copy-popup-button').addEventListener('click', () => {
        navigator.clipboard.writeText(popupContent.innerText)
            .then(() => alert('Response copied to clipboard!'))
            .catch(err => console.error('Failed to copy text:', err));
    });

    // 기존의 모든 add-row-button에 이벤트 리스너 추가
    document.querySelectorAll('.add-row-button').forEach((button) => {
        addRowButtonEventListeners(button);
    });

    // x-axis 섹션 나누기 로직
    const xAxisContainer = document.getElementById("x-axis-container");
    const canvasContainer = document.getElementById("canvas-container");

    // 스크롤 동기화 설정
    xAxisContainer.addEventListener("scroll", () => {
        canvasContainer.scrollLeft = xAxisContainer.scrollLeft;
    });

    canvasContainer.addEventListener("scroll", () => {
        xAxisContainer.scrollLeft = canvasContainer.scrollLeft;
    });

    // 세 섹션 각각에 “Before,” “During,” “After” 이름 지정
    function setupTimeDivisions() {
        const timeDivisions = ["Before", "During", "After"];
        const sections = document.querySelectorAll(".time-dividing-section");

        sections.forEach((section, index) => {
            const textbox = section.querySelector(".time-axis-textbox");
            textbox.placeholder = timeDivisions[index];
        });
    }

    setupTimeDivisions();

    // 섹션 크기 조절 핸들 설정
    const handles = document.querySelectorAll(".resize-handle");
    let isResizing = false;
    let startX;
    let startWidthLeft;
    let startWidthRight;

    handles.forEach((handle) => {
        handle.addEventListener("mousedown", (event) => {
            isResizing = true;
            startX = event.clientX;

            const leftSection = handle.previousElementSibling;
            const rightSection = handle.nextElementSibling;

            startWidthLeft = leftSection.getBoundingClientRect().width;
            startWidthRight = rightSection.getBoundingClientRect().width;

            function onMouseMove(event) {
                if (!isResizing) return;

                // 이동량을 25의 배수로 제한
                const dx = Math.round((event.clientX - startX) / 25) * 25;

                // 최소 너비를 10px로 제한
                const newWidthLeft = Math.max(startWidthLeft + dx, 10);
                const newWidthRight = Math.max(startWidthRight - dx, 10);

                leftSection.style.flexBasis = `${newWidthLeft}px`;
                rightSection.style.flexBasis = `${newWidthRight}px`;
            }

            function onMouseUp() {
                isResizing = false;
                window.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
            }

            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
        });
    });
});

function setup() {
    const canvas = createCanvas(columns * cellSize, rows * cellSize); // 초기 canvas 크기
    canvas.parent("canvas-container");

    if (!socket) {
        console.error("Socket is not initialized. Please ensure the socket connection is established.");
        return;
    }

    socket.on("load nodes", (serverNodes) => {
        serverNodes.forEach((node) => {
            const newNode = createNodeWithInteractionBand(
                node.x,
                node.y,
                node.color,
                node.description,
                node.id,
                node.subid
            );
            nodes.push(newNode);
        });
    });

    // 노드 생성 시 순서대로 색상 할당
    socket.on("new node", (nodeData) => {
        const nodeColor = getNextNeonColor(); // 새 노드를 위한 순서대로 색상 할당
        const newNode = createNodeWithInteractionBand(
            nodeData.x,
            nodeData.y,
            nodeColor, // 순서대로 할당된 색상 적용
            nodeData.description,
            nodeData.id,
            nodeData.subid
        );
        nodes.push(newNode);
    });
}
const titleInput = document.getElementById("app-title-input");

function saveTitle(reason) {
    const titleText = titleInput.value.trim(); // 입력된 값 가져오기
    if (titleText) {
        console.log(`저장된 제목 (${reason}):`, titleText); // 이유와 함께 콘솔에 제목 출력

    }
}

// Enter 키 입력 시 제목 저장 및 focus 해제
titleInput.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        event.preventDefault(); // 기본 Enter 행동 방지
        titleInput.removeEventListener("blur", onBlurSave); // blur 이벤트 일시적으로 비활성화
        saveTitle("Enter Key"); // 제목 저장
        titleInput.blur(); // focus 해제
        setTimeout(() => titleInput.addEventListener("blur", onBlurSave), 0); // blur 이벤트 복원
    }
});

// focus 해제 시 저장 함수 호출
function onBlurSave() {
    saveTitle("Focus Lost");
}

titleInput.addEventListener("blur", onBlurSave);

function syncWidth() {
    const canvasContainer = document.getElementById("canvas-container");
    const xAxisContainer = document.getElementById("x-axis-container");
    xAxisContainer.style.width = `${canvasContainer.offsetWidth}px`;
}

// 페이지 로드 시와 창 크기 조정 시 동기화
window.addEventListener("load", syncWidth);
window.addEventListener("resize", syncWidth);

// ✅ JSON 저장 함수
function saveToJSON() {
    const data = {
        title: titleInput.value.trim(),
        nodes: nodes.map(node => ({
            id: node.id,
            subid: node.subid,
            x: node.x,
            y: node.y,
            color: node.color,
            description: node.description,
            hasText: node.hasText,
            isDiamond: node.isDiamond
        })),
        rows: Array.from(document.querySelectorAll('.artifact-row')).map(row => ({
            id: row.id,
            type: row.querySelector('.main-artifact') ? 'Main Artifact' : 'Sub Artifact',
            description: row.querySelector('.main-artifact, .sub-artifact').textContent.trim()
        }))
    };

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `project_data_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);

    console.log("JSON 파일이 성공적으로 저장되었습니다!");
}

async function updateJSONOnServer() {
    const data = {
        title: titleInput.value.trim(),
        nodes: nodes.map(node => ({
            id: node.id,
            subid: node.subid,
            x: node.x,
            y: node.y,
            color: node.color,
            description: node.description,
            hasText: node.hasText,
            isDiamond: node.isDiamond
        })),
        rows: Array.from(document.querySelectorAll('.artifact-row')).map(row => ({
            id: row.id,
            type: row.querySelector('.main-artifact') ? 'Main Artifact' : 'Sub Artifact',
            description: row.querySelector('.main-artifact, .sub-artifact').textContent.trim()
        }))
    };

    try {
        const response = await fetch('/update-json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            console.log('JSON 파일이 서버에서 성공적으로 업데이트되었습니다.');
            alert('JSON 파일이 성공적으로 업데이트되었습니다!');
        } else {
            console.error('JSON 파일 업데이트 실패');
            alert('JSON 파일 업데이트에 실패했습니다.');
        }
    } catch (error) {
        console.error('네트워크 오류:', error);
        alert('네트워크 오류로 인해 JSON 파일 업데이트에 실패했습니다.');
    }
}

document.getElementById('save-json-button').addEventListener('click', updateJSONOnServer);

const saveJsonButton = document.getElementById('save-json-button');
let lastScrollY = window.scrollY;

// 스크롤 이벤트 추가
window.addEventListener('scroll', () => {
    if (window.scrollY > lastScrollY) {
        // 아래로 스크롤 시 버튼 숨기기
        saveJsonButton.classList.add('hidden');
    } else {
        // 위로 스크롤 시 버튼 표시
        saveJsonButton.classList.remove('hidden');
    }
    lastScrollY = window.scrollY;
});

saveJsonButton.addEventListener('click', async () => {
    console.log('✅ SEND 버튼이 클릭되었습니다.');
    if (typeof handleSaveAndPrompt === 'function') {
        await handleSaveAndPrompt(); // 함수 실행
    } else {
        console.error('❌ handleSaveAndPrompt 함수가 정의되지 않았습니다.');
    }
});

document.getElementById('copy-popup-button').addEventListener('click', () => {
    navigator.clipboard.writeText(popupContent.innerText)
        .then(() => alert('Response copied to clipboard!'))
        .catch(err => console.error('Failed to copy text:', err));
});