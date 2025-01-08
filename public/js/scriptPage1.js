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

function addResizeHandler(element) {
  // 상단 resize handler 생성
  const topResizeHandler = document.createElement("div");
  topResizeHandler.className = "artifact-resize-handler top";
  topResizeHandler.style.width = "100%";
  topResizeHandler.style.height = "5px";
  topResizeHandler.style.cursor = "ns-resize";
  topResizeHandler.style.position = "absolute";
  topResizeHandler.style.top = "0";
  topResizeHandler.style.left = "0";

  // 하단 resize handler 생성
  const bottomResizeHandler = document.createElement("div");
  bottomResizeHandler.className = "artifact-resize-handler bottom";
  bottomResizeHandler.style.width = "100%";
  bottomResizeHandler.style.height = "5px";
  bottomResizeHandler.style.cursor = "ns-resize";
  bottomResizeHandler.style.position = "absolute";
  bottomResizeHandler.style.bottom = "0";
  bottomResizeHandler.style.left = "0";

  element.style.position = "relative"; // 부모 요소의 위치 설정
  element.appendChild(topResizeHandler); // 상단에 resize handler 추가
  element.appendChild(bottomResizeHandler); // 하단에 resize handler 추가

  let startY;
  let startHeight;

  // resize 동작을 정의하는 함수
  function resize(event, initialY, initialHeight, direction) {
    const deltaY = event.clientY - initialY;
    if (direction === "top") {
      element.style.height = `${initialHeight - deltaY}px`; // 상단에서 조절
    } else {
      element.style.height = `${initialHeight + deltaY}px`; // 하단에서 조절
    }
  }

  // 상단 resize handler 이벤트 리스너
  topResizeHandler.addEventListener("mousedown", (event) => {
    startY = event.clientY;
    startHeight = parseInt(
      document.defaultView.getComputedStyle(element).height,
      10
    );
    document.documentElement.addEventListener("mousemove", (e) =>
      resize(e, startY, startHeight, "top")
    );
    document.documentElement.addEventListener("mouseup", stopResize);
  });

  // 하단 resize handler 이벤트 리스너
  bottomResizeHandler.addEventListener("mousedown", (event) => {
    startY = event.clientY;
    startHeight = parseInt(
      document.defaultView.getComputedStyle(element).height,
      10
    );
    document.documentElement.addEventListener("mousemove", (e) =>
      resize(e, startY, startHeight, "bottom")
    );
    document.documentElement.addEventListener("mouseup", stopResize);
  });

  // resize 동작 종료 함수
  function stopResize() {
    document.documentElement.removeEventListener("mousemove", resize);
    document.documentElement.removeEventListener("mouseup", stopResize);
  }
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

// + 버튼 우클릭 메뉴 표시 함수
function showPlusButtonContextMenu(x, y, addButton) {
  const existingMenu = document.getElementById("context-menu");
  if (existingMenu) {
    existingMenu.remove();
  }

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

  addSubArtifactOption.addEventListener("click", () => {
    addNewRow(true); // Sub Artifact 스타일로 생성
    menu.remove();
  });

  menu.appendChild(addSubArtifactOption);
  document.body.appendChild(menu);

  document.addEventListener("click", () => {
    if (document.body.contains(menu)) {
      menu.remove();
    }
  });
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
    userDescr.style.position = "fixed"; // 화면에 고정
    userDescr.style.right = "20px"; // 화면 우측 20px에 고정
    userDescr.style.bottom = "20px"; // 화면 하단 20px에 고정
    userDescr.style.backgroundColor = "#1e1e1e";
    userDescr.style.color = "#FFFFFF";
    userDescr.style.padding = "10px";
    userDescr.style.borderRadius = "8px";
    userDescr.style.border = "1px solid #CCC";
    userDescr.style.zIndex = "9999";
    userDescr.style.maxHeight = "300px";
    userDescr.style.overflowY = "auto";
    userDescr.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.3)"; // 그림자 추가
    userDescr.style.transition = "transform 0.2s ease-in-out"; // 부드러운 애니메이션
    userDescr.style.pointerEvents = "auto"; // 이벤트 수신 활성화
    document.body.appendChild(userDescr);
  }

  // 더블 클릭 이벤트가 뒤로 전달되지 않도록 방지
  userDescr.addEventListener("dblclick", function (event) {
    event.stopPropagation(); // 이벤트 전파 차단
    event.preventDefault(); // 기본 동작 방지
  });

  userDescr.addEventListener("mousedown", function (event) {
    event.stopPropagation(); // 다른 요소로의 이벤트 전파 방지
  });

  const newDescr = document.createElement("div");
  newDescr.style.marginBottom = "10px";

  const nodeName = document.createElement("span");
  nodeName.id = `user-info-${id}`; 
  nodeName.textContent = `${userName}`;
  nodeName.style.cursor = "pointer";
  nodeName.style.display = "block";
  nodeName.style.color = color;

  // 더블 클릭으로 이름 편집 가능
  nodeName.addEventListener("dblclick", function (event) {
    event.stopPropagation(); // 부모 및 다른 요소로 이벤트 전파 방지
    event.preventDefault(); // 기본 동작 방지

    const input = document.createElement("input");
    input.type = "text";
    input.value = nodeName.textContent;

    // 입력 필드 스타일링
    input.style.color = color; // 텍스트 색상
    input.style.backgroundColor = "#2c2c2c"; // 배경색
    input.style.border = "1px solid #555"; // 테두리
    input.style.borderRadius = "4px"; // 둥근 모서리
    input.style.padding = "4px 8px"; // 내부 여백
    input.style.fontSize = "14px"; // 글꼴 크기
    input.style.outline = "none"; // 포커스 시 외곽선 제거
    input.style.marginTop = "4px"; // 위쪽 여백
    input.style.width = "80%"; // 입력 필드 너비

    // 입력 필드 너비를 텍스트 길이에 따라 설정
    const tempSpan = document.createElement("span");
    tempSpan.style.visibility = "hidden"; // 화면에 보이지 않도록 설정
    tempSpan.style.whiteSpace = "pre"; // 공백과 줄바꿈을 유지
    tempSpan.style.font = "14px Arial"; // 입력 필드와 동일한 글꼴 및 크기
    tempSpan.textContent = input.value || " "; // 입력된 텍스트 적용
    document.body.appendChild(tempSpan); // 임시 요소 추가

    input.style.width = `${tempSpan.offsetWidth + 20}px`; // 텍스트 길이에 맞게 너비 설정
    document.body.removeChild(tempSpan); // 임시 요소 제거

    /** isReplaced 플래그를 다는 이유":
     * 관리자가 방(input)을 다른 방(nodeName)으로 교체함. 
     * 그 직후 청소부가 방의 문을 닫으려 했지만, 방이 이미 교체되어 문이 존재하지 않음. 
     * 그래서 오류가 발생함. 따라서 중복 방지 플래그를 달아서 keypress와 blur가 동시에 실행되지 않도록 플래그를 만듦. */
    let isReplaced = false;

    input.addEventListener("keypress", function (event) {
      if (event.key === "Enter" && !isReplaced) {
        isReplaced = true; // 중복 방지 플래그 설정
        nodeName.textContent = input.value || `User [${id}]`;
        if (input.parentNode) input.replaceWith(nodeName); // 노드가 아직 존재하는지 확인
      }
    });

    input.addEventListener("blur", function () {
      if (!isReplaced) { // 중복 방지 플래그 확인
        isReplaced = true; // 중복 방지 플래그 설정
        nodeName.textContent = input.value || `User [${id}]`;
        if (input.parentNode) input.replaceWith(nodeName); // 노드가 아직 존재하는지 확인
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
  return { id: nodeName.id, name: userName };
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
  //인터렉션 밴드 위치(수정예정)
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

// 인터렉션 밴드 작성 시, 문자열 길이에 맞게 width를 조정하는 함수
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
  socket = io();

  let isPromptOpen = true; // 현재 promptTextInput이 열린 상태인지 여부

  document
    .getElementById("add-row-button")
    .addEventListener("click", () => addNewRow(false));

  // 로딩 스피너 함수
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

  /** ✅ openAIPhase1 모듈 */
  const openAIPhase1 = {
    /** 🔄 Phase1: OpenAI API 호출 */
    ask(prompt) {
      console.log("🚀 [Phase1] Client sent Phase1 prompt:", prompt);
      socket.emit("firstPrompting", { prompt });
      showLoadingSpinner("시나리오 업데이트 중 ...");
    },

    /** 📝 Phase1: 첫 번째 OpenAI 응답을 텍스트 박스에 추가 */
    addResponseToTextBox(response) {
      const responseBox = document.getElementById("response-box");
      if (responseBox) {
        responseBox.value = response; // 첫 번째 응답 추가
        console.log("✅ [Phase1] Response added to response-box:", response);
      } else {
        console.error("❌ [Phase1] response-box not found!");
      }
    },

    /** 🔄 Phase1: 첫 번째 OpenAI 응답 처리 */
    init() {
      socket.on("openai response", (data) => {
        if (data.response) {
          console.log("✅ [Phase1] First OpenAI API response:", data.response);

          this.addResponseToTextBox(data.response);
          hideLoadingSpinner();
          console.log("➡️ [Phase1] Ready for Phase2 transition.");
        } else if (data.error) {
          console.error("❌ [Phase1] Frontend error during first prompt:", data.error);
          hideLoadingSpinner();
        }
      });
    }
  };

  /** ✅ Phase1 이벤트 리스너 */
  document
    .getElementById("promptTextInput-send")
    .addEventListener("click", function () {
      const prompt = document.getElementById("promptTextInput-field").value;
      if (prompt.trim()) {
        openAIPhase1.ask(prompt);
      } else {
        console.warn("⚠️ [Phase1] Empty prompt. Please enter some text.");
      }
    });

  /** ✅ Phase1 초기화 */
  openAIPhase1.init();

  /** ✅ openAIPhase2 모듈 */
  const openAIPhase2 = {
    /** 🔄 Phase2: OpenAI API 호출 (secondPrompting) */
    ask() {
      console.log("🚀 [Phase2] Sending secondPrompting to server...");
      socket.emit("secondPrompting");
      showLoadingSpinner("맵 생성 중 ...");
    },

    /** 🛠️ Phase2: 최종 OpenAI 응답 처리 */
    parseArtifactsAndAddRows(response) {
      try {
        console.log("🛠️ [Phase2] Parsing artifacts and adding rows:", response);

        const data = JSON.parse(response); // JSON 파싱

        // ✅ Main/Sub Artifact 추가
        if (data.artifacts && Array.isArray(data.artifacts)) {
          data.artifacts.forEach((artifact) => {
            if (artifact.mainArtifact) {
              addNewRow(false, artifact.mainArtifact); // Main Artifact 추가

              if (artifact.subArtifacts && Array.isArray(artifact.subArtifacts)) {
                artifact.subArtifacts.forEach((subArtifact) => {
                  addNewRow(true, subArtifact); // Sub Artifact 추가
                });
              }
            }
          });
        }

        // ✅ 사용자 노드 추가
        if (data.users && Array.isArray(data.users)) {
          data.users.forEach((user, index) => {
            const userColor = getNextNeonColor();
            const userId = index + 1;

            const fixedX = cellSize / 2;
            const fixedY = (userId - 1) * cellSize + cellSize / 2;

            const newNode = createNodeWithInteractionBand(
              fixedX,
              fixedY,
              userColor,
              "",
              userId,
              1,
              true
            );
            nodes.push(newNode);
            socket.emit("new node", newNode);

            createUserDescr(userColor, userId, user);
          });
        }

        console.log("✅ [Phase2] Artifacts and Users parsed successfully!");
      } catch (error) {
        console.error("❌ [Phase2] Failed to parse JSON response:", error);
      }
    },

    /** 🔄 Phase2: 최종 OpenAI 응답 리스너 */
    init() {
      socket.on("final openai response", (data) => {
        if (data.response) {
          console.log("✅ [Phase2] Final OpenAI API response:", data.response);
          this.parseArtifactsAndAddRows(data.response);
          hideLoadingSpinner();
        } else if (data.error) {
          console.error("❌ [Phase2] Frontend error during second prompt:", data.error);
          hideLoadingSpinner();
        }
      });
    }
  };

  /** ✅ Phase2 이벤트 리스너 */
  document
    .getElementById("promptMapInput-close")
    .addEventListener("click", function () {
      console.log("🚀 [Phase2] Starting Phase2 process...");
      openAIPhase2.ask();
    });

  /** ✅ Phase2 초기화 */
  openAIPhase2.init();


  // 화살표 버튼 클릭 이벤트 처리
  document
    .getElementById("toggle-arrow")
    .addEventListener("click", function () {
      const promptTextInput = document.getElementById("promptTextInput");
      const arrowIcon = document.querySelector("#toggle-arrow i"); // 아이콘 요소 선택

      if (isPromptOpen) {
        // promptTextInput을 내림
        promptTextInput.style.bottom = "-35%"; // 창이 화면 아래로 내려감
        arrowIcon.classList.remove("fa-chevron-down"); // 아래 화살표 제거
        arrowIcon.classList.add("fa-chevron-up"); // 위쪽 화살표 추가
      } else {
        // promptTextInput을 올림
        promptTextInput.style.bottom = "0"; // 창이 화면 위로 올라감
        arrowIcon.classList.remove("fa-chevron-up"); // 위 화살표 제거
        arrowIcon.classList.add("fa-chevron-down"); // 아래 화살표 추가
      }

      isPromptOpen = !isPromptOpen; // 상태 토글
    });

  // 애니메이션 효과: 페이지 로드 후 슬라이드 업
  const promptTextInput = document.getElementById('promptTextInput');
  const openButton = document.getElementById('promptTextInput-close');
  const closeButton = document.getElementById('toggle-arrow');
  // 🌟 창 열기/닫기 토글 기능
  openButton.addEventListener('click', () => {
    if (promptTextInput.classList.contains('active')) {
      // 이미 열려있다면 닫기
      console.log('🚪 [Sliding Panel] Closing panel...');
      promptTextInput.classList.remove('active');
    } else {
      // 닫혀있다면 열기
      console.log('🚀 [Sliding Panel] Opening panel...');
      promptTextInput.classList.add('active');
    }
  });

  // 🌟 창 닫기 (닫기 버튼 전용)
  closeButton.addEventListener('click', () => {
    console.log('🚪 [Sliding Panel] Closing panel via close button...');
    promptTextInput.classList.remove('active');
  });

  function parseArtifactsAndAddRows(responseJSON) {
    try {
      const data = JSON.parse(responseJSON); // JSON 파싱

      // ✅ Main/Sub Artifact 추가
      if (data.artifacts && Array.isArray(data.artifacts)) {
        data.artifacts.forEach((artifact) => {
          if (artifact.mainArtifact) {
            addNewRow(false, artifact.mainArtifact); // Main Artifact 추가

            if (artifact.subArtifacts && Array.isArray(artifact.subArtifacts)) {
              artifact.subArtifacts.forEach((subArtifact) => {
                addNewRow(true, subArtifact); // Sub Artifact 추가
              });
            }
          }
        });
      }

      // ✅ 사용자 노드 추가
      if (data.users && Array.isArray(data.users)) {
        data.users.forEach((user, index) => {
          const userColor = getNextNeonColor();
          const userId = index + 1;

          const fixedX = cellSize / 2;
          const fixedY = (userId - 1) * cellSize + cellSize / 2;

          const newNode = createNodeWithInteractionBand(
            fixedX,
            fixedY,
            userColor,
            "",
            userId,
            1,
            true
          );
          nodes.push(newNode);
          socket.emit("new node", newNode);

          createUserDescr(userColor, userId, user);
        });
      }

      console.log("Artifacts and Users parsed successfully!");
    } catch (error) {
      console.error("Failed to parse JSON response:", error);
    }
  }

  //   element.addEventListener("dblclick", function () {
  //     const input = document.createElement("input");
  //     input.type = "text";
  //     input.value = element.textContent;

  //     // 현재 element의 클래스 이름을 유지
  //     const originalClass = element.className;
  //     input.className = originalClass;

  //     element.replaceWith(input);
  //     input.focus();

  //     // Enter 키 처리
  //     input.addEventListener("keypress", function (event) {
  //       if (event.key === "Enter") {
  //         const updatedDescr = input.value.trim();
  //         if (updatedDescr) {
  //           // 텍스트가 있으면 해당 클래스 유지
  //           element.textContent = updatedDescr;
  //           element.className = originalClass; // 원래 클래스 유지
  //           input.replaceWith(element);
  //         } else {
  //           // 텍스트가 없으면 해당 클래스 제거하여 빈 div로 남기기
  //           element.textContent = "";
  //           element.className = ""; // 클래스 제거
  //           element.style.border = "none";
  //           element.style.backgroundColor = "transparent";
  //           element.style.boxShadow = "none";
  //           input.replaceWith(element);
  //         }
  //         console.log(`Updated ${originalClass}: ${updatedDescr || "(empty)"}`);
  //         socket.emit(`update ${originalClass}`, updatedDescr); // 서버에 업데이트 전송
  //       }
  //     });

  //     // 포커스를 잃었을 때도 동일한 동작 수행
  //     input.addEventListener("blur", function () {
  //       const updatedDescr = input.value.trim();
  //       if (updatedDescr) {
  //         // 텍스트가 있으면 해당 클래스 유지
  //         element.textContent = updatedDescr;
  //         element.className = originalClass; // 원래 클래스 유지
  //         input.replaceWith(element);
  //       } else {
  //         // 텍스트가 없으면 해당 클래스 제거하여 빈 div로 남기기
  //         element.textContent = "";
  //         element.className = ""; // 클래스 제거
  //         element.style.border = "none";
  //         element.style.backgroundColor = "transparent";
  //         element.style.boxShadow = "none";
  //         input.replaceWith(element);
  //       }
  //       console.log(
  //         `Updated ${originalClass} on blur: ${updatedDescr || "(empty)"}`
  //       );
  //       socket.emit(`update ${originalClass}`, updatedDescr); // 서버에 업데이트 전송
  //     });
  //   });
  // }

  // x-axis 섹션 나누기 로직

  const openAIPhase3 = {
    /** 🔄 Phase3: OpenAI API 호출 */
    ask(prompt) {
      console.log("Client sent Phase3 prompt:", prompt);
      socket.emit("scenarioPrompting", { prompt });
      showLoadingSpinner("시나리오 텍스트 생성 중");
    },

    /** 📝 Phase3: JSON 파일 가져오기 */
    async fetchScenarioPrompt() {
      try {
        const response = await fetch('/scenarioMakingPrompt.json');
        if (!response.ok) throw new Error('Failed to load scenarioMakingPrompt.json');

        const jsonData = await response.json();
        console.log("✅ Loaded scenarioMakingPrompt.json:", jsonData);
        return JSON.stringify(jsonData);
      } catch (error) {
        console.error("❌ Error loading scenarioMakingPrompt.json:", error);
        hideLoadingSpinner();
        return null;
      }
    },
    
    init() {
      socket.on("scenario response", async (data) => {
        if (data.response) {
          console.log("✅ Scenario response:", data.response);

          // ✅ 팝업 활성화
          const popup = document.getElementById("scenario-popup");
          popup.classList.add("active"); // 슬라이딩 효과 적용

          // ✅ 내용 추가
          this.addScenarioToPopup(data.response);

          // ✅ 이미지 생성 중 로딩 스피너 유지
          showLoadingSpinner("이미지 생성 중.. ");
        } else if (data.error) {
          console.error("❌ Frontend error during scenario prompt:", data.error);
          hideLoadingSpinner();
        }
      });
    },

    /** ✅ Phase3: 팝업 창에 응답 표시 */
    addScenarioToPopup(response) {
      const popup = document.getElementById('scenario-popup');
      const closeButton = document.getElementById('close-popup-button');
      const copyButton = document.getElementById('copy-popup-button');

      if (!popup || !closeButton || !copyButton) {
        console.error('❌ [Popup] Popup elements not found. Check your HTML structure.');
        return;
      }

      console.log('✅ [Popup] Response added to scenario-text:', response);

      // ✅ 팝업 표시 (슬라이드 인)
      popup.classList.add('active');
      console.log('🚀 [Popup] Popup opened with sliding animation');

      // ✅ 닫기 버튼 이벤트 리스너
      closeButton.onclick = () => {
        popup.classList.remove('active'); // 슬라이드 아웃
        console.log('🚪 [Popup] Popup closed with sliding animation');
      };

      // ✅ 복사 버튼 이벤트 리스너
      copyButton.onclick = () => {
        navigator.clipboard.writeText(response)
          .then(() => {
            console.log('✅ [Popup] Text copied to clipboard.');
            alert('✅ Text has been copied!');
          })
          .catch(err => {
            console.error('❌ [Popup] Error copying text:', err);
          });
      };

      // ✅ JSON 자동 변환 실행
      console.log('🔄 Automatically converting response to JSON...');
      this.convertImagePromptToJson(response);
    },

    /** ✅ response를 JSON 형식으로 변환 */
    convertImagePromptToJson(response) {
      console.log('📦 Converting response to JSON...');

      const sentences = response.split('.').filter(sentence => sentence.trim() !== '');
      const stepCount = 5; // ✅ 단계 수를 5개로 설정
      const stepSize = Math.ceil(sentences.length / stepCount);

      // ✅ 5단계로 나누기
      let step1Text = sentences.slice(0, stepSize).join('. ') + '.';
      let step2Text = sentences.slice(stepSize, stepSize * 2).join('. ') + '.';
      let step3Text = sentences.slice(stepSize * 2, stepSize * 3).join('. ') + '.';
      let step4Text = sentences.slice(stepSize * 3, stepSize * 4).join('. ') + '.';
      let step5Text = sentences.slice(stepSize * 4).join('. ') + '.';

      document.getElementById('scenario-text-1').innerText = step1Text;
      document.getElementById('scenario-text-2').innerText = step2Text;
      document.getElementById('scenario-text-3').innerText = step3Text;
      document.getElementById('scenario-text-4').innerText = step4Text;
      document.getElementById('scenario-text-5').innerText = step5Text;

      const jsonObject = {
        step1Text,
        step2Text,
        step3Text,
        step4Text,
        step5Text
      };

      console.log('✅ JSON Conversion Complete:', jsonObject);
      alert('✅ response가 JSON 형식으로 변환되었습니다. 콘솔을 확인하세요.');

      // ✅ 서버로 전송
      console.log('📤 Sending JSON data to server...');
      socket.emit('generateImage', jsonObject);
    },

    /** ✅ Phase3: JSON 저장 및 API 호출 */
    async handleSaveAndPrompt() {
      const scenarioPrompt = await this.fetchScenarioPrompt();
      if (!scenarioPrompt) {
        alert("scenarioMakingPrompt.json 파일을 불러오는 데 실패했습니다.");
        return;
      }

      // OpenAI API 호출
      await this.ask(scenarioPrompt);

      // JSON 업데이트
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
    },

    handleImageResponse() {
      socket.on('image response', ({ imageUrls, error }) => {
        console.log('📥 [Client] Received image response from server:', { imageUrls, error });

        const popup = document.getElementById('scenario-popup');

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

        imageUrls.forEach(({ step, imageUrl }, index) => {
          setTimeout(() => {
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

            if (index === imageUrls.length - 1) {
              // 로딩 스피너 숨기기
              hideLoadingSpinner();
              console.log('✅ All images generated. Hiding spinner.');
            }
          }, index * 1500);
        });

        popup.style.display = 'flex';
      });
    }
  };

  // Phase3 이벤트 리스너 🖱️save-json-button 클릭 이벤트
  document.getElementById("save-json-button").addEventListener("click", async function () {
    console.log("✅ Save button clicked. Starting OpenAI Phase3...");
    await openAIPhase3.handleSaveAndPrompt();
    await openAIPhase3.handleImageResponse();
  });

  document.getElementById("close-popup-button").addEventListener("click", () => {
    const popup = document.getElementById("scenario-popup");
    popup.classList.remove("active"); // 팝업 숨기기
  });

  // Phase3 초기화
  openAIPhase3.init();

  document.getElementById('copy-popup-button').addEventListener('click', () => {
    navigator.clipboard.writeText(popupContent.innerText)
      .then(() => alert('Response copied to clipboard!'))
      .catch(err => console.error('Failed to copy text:', err));
  });

  // 기존의 모든 add-row-button에 이벤트 리스너 추가
  document.querySelectorAll('.add-row-button').forEach((button) => {
    addRowButtonEventListeners(button);
  });

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
  const userNames = [];
  const userElements = document.querySelectorAll('[id^="user-info-"]');

  // 각 요소에서 userName을 가져와 배열에 저장
  userElements.forEach(element => {
    const userName = element.textContent.trim();
    userNames.push(userName);
  });

  const data = {
    title: titleInput.value.trim(),
    User: userNames,
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
  const userNames = [];
  const userElements = document.querySelectorAll('[id^="user-info-"]');

  // 각 요소에서 userName을 가져와 배열에 저장
  userElements.forEach(element => {
    const userName = element.textContent.trim();
    userNames.push(userName);
  });

  const data = {
    title: titleInput.value.trim(),
    User: userNames,
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