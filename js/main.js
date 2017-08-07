var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var width = 400;
var height = 400;

var img, file, img_u8, mat, pos, points, grid, q, src_img;

var dz = document.getElementById('dropzone');
dropzone.addEventListener('dragenter', noop, false);
dropzone.addEventListener('dragexit', noop, false);
dropzone.addEventListener('dragover', noop, false);
dropzone.addEventListener('drop', drop, false);

var r = new FileReader();
r.onload = init;

function newFile(el) {
	r.readAsDataURL(el.files[0]);
}

function init(e) {
	file = e.target.result;
	img = new Image();
	img.src = file;	
	img.onload = function() {
		dropzone.style.display = "none";
		ctx.drawImage(img, 1, 1, width-1, height-1);
		setup();
		setTimeout(proc,10);
	};
}

function drop(event) {
	event.stopPropagation();
	event.preventDefault();
	r.readAsDataURL(event.dataTransfer.files[0]);
}

function noop(event) {
	event.stopPropagation();
	event.preventDefault();
}

function setup() {
	img_u8 = new jsfeat.matrix_t(width, height, jsfeat.U8_t | jsfeat.C1_t);

  grid = new Array(9);
  q = new Array(9);
  for (var i=0;i<9;i++) {
  	grid[i] = new Array(9);
  	q[i] = new Array(9);
  }
  pos = [];
}

function proc() {

	// get image data
	var img_data = ctx.getImageData(0, 0, width, height);

	// render image for comparision
	render_img(img_data, img_data, 400, 0);

	// generate grayscale
	jsfeat.imgproc.grayscale(img_data.data, width, height, img_u8);

	render_img(img_data, img_u8, 800, 0);

	// generate blurred image
	jsfeat.imgproc.gaussian_blur(img_u8, img_u8, 1, sigma = 0);

	render_img(img_data, img_u8, 0, 400);

	// convert to binary for better detection
	for (var i=width*height-1; i>=0; i--) {
		if (img_u8.data[i] < 150) {
			img_u8.data[i] = 0;
		}
		else img_u8.data[i] = 255;
	}

	render_img(img_data, img_u8, 400, 400);


	// get image matrix
	mat = new Array(height);
	for (var i=0; i<height; i++) {
		mat[i] = new Array(width);
	}

	for (var i=0; i<height; i++) {
		for (var j=0; j<width; j++) {
			mat[i][j] = img_u8.data[j*400+i];
			if (i == 0 || i == height-1 || j == 0 || j == width - 1) mat[i][j] = 255; 
		}
	}


	// get square positions
	top_left();
	top_right();
	bot_right();
	bot_left();


	// remove long horizontal lines
	var ln;
	for (var i=0; i<400*400-1; i++) {
		if (img_u8.data[i] == 0) {
			ln = 0;
			for (var j=i+1; j<400*400; j++) {
				if (img_u8.data[j] == 0)ln++;
				else break;
			}
			if (ln >= 50) {
				for (var j=0; j<ln; j++) {
					img_u8.data[i+j] = 255;
				}
				i+=ln;
			}
		}
	}

	// remove long vertical lines
	for (var i=0; i<400; i++) {
		for (var j=0; j<400; j++) {
			if (mat[i][j] == 0) {
				ln = 0;
				for (var k=j+1;k<400; k++) {
					if (mat[i][k] == 0) ln++;
					else break;
				}
				if (ln >= 50) {
					for (var k=0; k<ln; k++) {
						img_u8.data[i+((j+k)*400)] = 255;
					}
					j+=ln;
				}
			}
		}
	}


	// blur image to remove independent short lines
	jsfeat.imgproc.gaussian_blur(img_u8, img_u8, 6, sigma = 0);

	render_img(img_data, img_u8, 800, 400);


	// again convert to binary
	for (var i=width*height-1; i>=0; i--) {
		if (img_u8.data[i] < 150) {
			img_u8.data[i] = 0;
		}
		else img_u8.data[i] = 255;
	}

	render_img(img_data, img_u8, 0, 800);
	render_img(img_data, img_u8, 0, 0);


	/*
	// draw square
	ctx.beginPath();
	ctx.moveTo(pos[0].x1, pos[0].y1);
	ctx.lineTo(pos[2].x1, pos[0].y1);
	ctx.moveTo(pos[2].x1, pos[0].y1);
	ctx.lineTo(pos[2].x1, pos[2].y1);
	ctx.moveTo(pos[2].x1, pos[2].y1);
	ctx.lineTo(pos[0].x1, pos[2].y1);
	ctx.moveTo(pos[0].x1, pos[2].y1);
	ctx.lineTo(pos[0].x1, pos[0].y1);
	ctx.stroke();*/

	// calculate cell dimensions
	var cell_width_top = Math.floor((pos[1].x1 - pos[0].x1) / 9);
	var cell_width_left = Math.floor((pos[3].y1 - pos[0].y1) / 9);
	var cell_width_bottom = Math.floor((pos[2].x1 - pos[3].x1) / 9);
	var cell_width_right = Math.floor((pos[2].y1 - pos[1].y1) / 9);
	var cell_width = Math.floor((pos[2].x1 - pos[0].x1) / 9);
	var cell_height = Math.floor((pos[2].y1 - pos[0].y1) / 9);

	// determine grid points
	points = new Array(10);
	for (var i=0;i<10;i++) points[i] = new Array(10);

	for (var i=0; i<=9; i++) {
		for (var j=0; j<=9; j++) {
			var x1 = pos[0].x1 + (i*cell_width);
			var y1 = pos[0].y1 + (j*cell_height);
			points[i][j] = {x:x1,y:y1};
		}
	}

	// read numbers
	for (var i=1; i<=9; i++) {
		for (var j=1; j<=9; j++) {
			//ctx.fillRect(400 + points[i][j].x, points[i][j].y, 5,5);
			var i_data = ctx.getImageData(points[i-1][j-1].x + 1, points[i-1][j-1].y + 1, cell_width - 1, cell_height - 1);
			var string = OCRAD(i_data);
			console.log(i,j,string);
			if (string.match(/[0-9]/) == null) {
				if (string.indexOf('|') >= 0 || string.indexOf('I') >= 0 || string.indexOf('l') >= 0) string = '1';
				else if (string.indexOf('&') >= 0 || string.indexOf('e') >= 0 || string.indexOf('a') >= 0 || string.indexOf('B') >= 0) string = '8';
				else if (string.indexOf('s') >= 0) string = "5";
				else if (string.indexOf('T') >= 0) string = "7";
			}
			string = string.match(/[0-9]/);
			grid[j-1][i-1] = string?parseInt(string[0]):0;
			q[j-1][i-1] = grid[j-1][i-1];
		}
	}

	console.table(grid);

	ctx.drawImage(img, 1, 1, 399, 399);
	// solve the sudoku
	setTimeout(function() {
		if (solve())
		for (var i=0; i<9; i++) {
			for (var j=0; j<9; j++) {
				ctx.font = cell_width-10 + "px Arial";
				ctx.fillStyle = "red";
				if (q[j][i] == 0) ctx.fillText(grid[j][i], 400 + points[i][j].x + cell_width / 2 - 5, points[i][j].y + cell_height - 5);
			}
		}
		document.body.addEventListener('click', function(e) {
			location.reload();
		});
	},10);


}

function solve() {
	var k;

	k=next_pos();
	if (k == false) return true;

	for (var i=1; i<=9; i++) {
		if (is_safe(k.r, k.c, i)) {
			grid[k.r][k.c] = i;
			if (solve()) return true;
			grid[k.r][k.c] = 0;
		}
	}
	return false;
}

function next_pos() {
	for (var i=0; i<9; i++) {
		for (var j=0; j<9; j++) {
			if (grid[i][j] == 0) return {r:i, c:j};
		}
	}
	return false;
}

function used_in_row(r, n) {
	for (var i=0; i<9; i++) 
		if (grid[r][i] == n) return true;
	return false;
}

function used_in_col(c, n) {
	for (var i=0; i<9; i++) 
		if (grid[i][c] == n) return true;
	return false;
}

function used_in_box(r, c, n) {
	for (var i=0; i<3; i++) {
		for (var j=0; j<3; j++) {
			if (grid[i+r][j+c] == n) return true;
		}
	}
	return false;
}

function is_safe(r, c, n) {
	return !used_in_row(r,n) && !used_in_col(c,n) && !used_in_box(r-r%3, c-c%3, n);
}


function bot_left() {
	var rad = 2, found, x, t;
	for (var i=0; i<height; i++) {
		if (mat[i][width-i] == 0) {
			found = true;
			for (var j=1; j<rad; j++) {
				if (mat[i+j][i-j] != 0) {
					found = false;
					break;
				}
			}
			if (found) {
				x = i;
				break;
			}
		} 
	}
	t = go_bottom(x,width-x);
	t = go_left(t.x1,t.y1);
	pos.push(t);
}

function bot_right() {
	var rad = 2, found, x, t;
	for (var i=height-1; i>=0; i--) {
		if (mat[i][i] == 0) {
			found = true;
			for (var j=1; j<rad; j++) {
				if (mat[i-j][i-j] != 0) {
					found = false;
					break;
				}
			}
			if (found) {
				x = i;
				break;
			}
		} 
	}
	t = go_right(x,x);
	t = go_bottom(t.x1,t.y1);
	pos.push(t);
}

function top_right() {
	var rad = 2, found, x, t;
	for (var i=height-1; i>=0; i--) {
		if (mat[i][width-i] == 0) {
			found = true;
			for (var j=1; j<rad; j++) {
				if (mat[i-j][i+j] != 0) {
					found = false;
					break;
				}
			}
			if (found) {
				x = i;
				break;
			}
		} 
	}
	t = go_right(x,width-x);
	t = go_top(t.x1,t.y1);
	pos.push(t);
}

function top_left() {
	var rad = 2, found, x, t;
	for (var i=0; i<height; i++) {
		if (mat[i][i] == 0) {
			found = true;
			for (var j=1; j<rad; j++) {
				if (mat[i+j][i+j] != 0) {
					found = false;
					break;
				}
			}
			if (found) {
				x = i;
				break;
			}
		} 
	}
	t = go_top(x,x);
	t = go_left(t.x1,t.y1);
	pos.push(t);
}

function go_top(x,y) {
	if (x <= 0 || y <= 0 || x>=width-2 || y>=width-2) return {x1:x, y1:y};
	while ( (x > 0 && y > 0) && (mat[x][y] == 0 || mat[x+1][y] == 0 || mat[x-1][y] == 0)) y--;
	return {x1:x, y1:y};
}

function go_left(x,y) {
	if (x <= 0 || y <= 0 || x>=width-2 || y>=width-2) return {x1:x, y1:y};
	while ( (x > 0 && y > 0) && (mat[x][y] == 0 || mat[x][y+1] == 0 || mat[x][y-1] == 0)) x--;
	return {x1:x, y1:y};
}

function go_bottom(x,y) {
	if (x <= 0 || y <= 0 || x>=width-2 || y>=width-2) return {x1:x, y1:y};
	while ( (x > 0 && y > 0) && (mat[x][y] == 0 || mat[x+1][y] == 0 || mat[x-1][y] == 0)) y++;
	return {x1:x, y1:y};
}

function go_right(x,y) {
	if (x <= 0 || y <= 0 || x>=width-2 || y>=width-2) return {x1:x, y1:y};
	while ( (x > 0 && y > 0) && (mat[x][y] == 0 || mat[x][y+1] == 0 || mat[x][y-1] == 0)) x++;
	return {x1:x, y1:y};
}

function render_img(img_data, img_u8, x, y) {
	var data_u32 = new Uint32Array(img_data.data.buffer);
	var alpha = (0xff << 24);
  var i = img_u8.cols*img_u8.rows, pix = 0;
  while(--i >= 0) {
  	pix = img_u8.data[i];
    data_u32[i] = alpha | (pix << 16) | (pix << 8) | pix;
  }
	ctx.putImageData(img_data, x, y);
}

function render_corners(corners, count, img, step) {
  var pix = (0xff << 24) | (0x00 << 16) | (0xff << 8) | 0x00;
  for(var i=0; i < count; ++i)
  {
    var x = corners[i].x;
    var y = corners[i].y;
    var off = (x + y * step);
    img[off] = pix;
    img[off-1] = pix;
    img[off+1] = pix;
    img[off-step] = pix;
    img[off+step] = pix;
  }
}
