/* nAnjs Matrix and vector algebra library
 *
 * This module contains all of the matrix functions and algorithms,
 * notably:
 *  - Addition, multiplication
 *  - Inversion
 *  - Decomposition (LU, QR, etc.).
 *  - Determinants
 * 
 * Also included are matrix and vector creation algorithms
*/


define('algebra', [], function() {

    var nanAlgebra = {};

    /* Matrix object
     *
     * Creates a matrix of size `size`.
     * If `buffer` is an array, the matrix points to it, instead of creating a new array
     *
     * There are no guarantees of the values being initialized.
     * The matrix is in row-major format (because of row-pivoting)
     */
    nanAlgebra.Matrix = function(size, buffer) {
        this.size = size.slice();
        this.array = buffer || new Array(size[0]*size[1]);
    }

    /* return a copy of the matrix
     */
    nanAlgebra.Matrix.prototype.copy = function () {
        c = new nanAlgebra.Matrix(this.size, this.array.slice());
        return c;
    }

    /*  A matrix of size `size` with ones on the diagonal
     */
    nanAlgebra.identity = function (size) {
        var s,r;
        (size.constructor === Array) ? s=size : s=[size,size];
        r = new nanAlgebra.Matrix(s);
        for (i=0; i<s[0]*s[1]; i++)
            r.array[i] = 0;
        for (i=0; i<Math.min(s[0],s[1]); i++)
            r.array[s[1]*i+i] = 1;
        return r;
    }

    /* A matrix of size `size` filled with random entries
     */
    nanAlgebra.random = function (size) {
        var r = new nanAlgebra.Matrix(size);
        for (i=0; i<size[0]*size[1]; i++)
            r.array[i] = Math.random();
        return r;
    }

    /* Return the sum of two matrices
     */
    nanAlgebra.Matrix.prototype.add = function (m) {
        if (this.size[0] != m.size[0] || this.size[1] != m.size[1])
            throw Error('Matrix dimensions ('+this.size+', '+m.size+
                        ') must agree');
        result = new nanAlgebra.Matrix(this.size)
        for (i=0; i<this.size[0]*this.size[1]; i++) {
            result.array[i] = this.array[i] + m.array[i]
        }
        return result;
    }
    
    /* Return the difference of two matrices
     */
    nanAlgebra.Matrix.prototype.subtract = function (m) {
        if (this.size[0] != m.size[0] || this.size[1] != m.size[1])
            throw Error('Matrix dimensions ('+this.size+', '+m.size+
                        ') must agree');
        result = new nanAlgebra.Matrix(this.size)
        for (i=0; i<this.size[0]*this.size[1]; i++) {
            result.array[i] = this.array[i] - m.array[i]
        }
        return result;
    }

    /* Multiply the matrix on the *right* by m */
    // TODO: profile this code
    nanAlgebra.Matrix.prototype.multiply = function (m) {
        if (this.size[1] != m.size[0]) 
            throw Error("The matrix dimensions don't agree for multiplication");
        result = new nanAlgebra.Matrix([this.size[0], m.size[1]]);
        for (i=0; i<result.size[0]; i++) {
            for (j=0; j<result.size[1]; j++) {
                result.array[result.size[1]*i+j] = 0;
                for (k=0; k<this.size[1]; k++) {
                    result.array[result.size[1]*i+j] +=
                        this.array[this.size[1]*i+k] * m.array[m.size[1]*k+j];
                }
            }
        }
        return result;
    }

    /* transpose a matrix
     */
    nanAlgebra.Matrix.prototype.transpose = function (m) {
        result = new nanAlgebra.Matrix([this.size[1], this.size[0]]);
        for (i=0; i<this.size[0]; i++) {
            for (j=0; j<this.size[1]; j++) {
                result.array[result.size[1]*j+i] = this.array[this.size[1]*i+j];
            }
        }
        return result;

    }

    /* A solver for upper triangular matrices, also known as a back-solve.
     *
     * The Matrix is not checked to be upper triangular, so no error will be
     * thrown if a non-zero element is below the diagonal. This makes it
     * possible to use on an LU decomposition that's stored in a single matrix.
     */
    nanAlgebra.Matrix.prototype.utSolve = function (b) {
        if (this.size[0] != this.size[1])
            throw new Error('Matrix must be square');
        if (this.size[1] != b.size[0]) 
            throw new Error('Number of rows in the matrices must agree');
        if (b.size[1] != 1)
            throw new Error('Upper triangular solve is only implemented for vectors in this version');

        var x = new nanAlgebra.Matrix(b.size);
        var xnew;
        var N = this.size[0];
        var i,j;
        for (i = N-1; i>=0; i--) {
            xnew = b.array[i]
            for (j = N-1; j>i; j--) {
                xnew -= this.array[N*i + j] * x.array[j];
            }
            x.array[i] = xnew/this.array[N*i + i];
        }
        return x;
    };

    /* A solver for lower triangular matrices, also known as a forward-solve.
     *
     * The Matrix is not checked to be lower triangular, so no error will be
     * thrown if a non-zero element is below the diagonal. This makes it
     * possible to use on an LU decomposition that's stored in a single matrix.
     *
     * Because it's designed to be used for LU decomposion, it is assumed that
     * the diagonal elements are all one.
     */
    nanAlgebra.Matrix.prototype.ltSolve = function (b) {
        if (this.size[0] != this.size[1])
            throw new Error('Matrix must be square');
        if (this.size[1] != b.size[0]) 
            throw new Error('Number of rows in the matrices must agree');
        if (b.size[1] != 1)
            throw new Error('Lower triangular solve is only implemented for vectors in this version');

        var x = new nanAlgebra.Matrix(b.size);
        var xnew;
        var N = this.size[0];
        var i,j;
        for (i = 0; i<N; i++) {
            xnew = b.array[i]
            for (j = 0; j<i; j++) {
                xnew -= this.array[N*i + j] * x.array[j];
            }
            x.array[i] = xnew;
        }
        return x;
    };

    /* LU decomposition of a matrix
     *
     * L is stored below the diagonal.
     */
    nanAlgebra.Matrix.prototype.luDecompose = function() {
        if (this.size[0] != this.size[1])
            throw new Error('Matrix must be square');
        
        // TODO: add pivoting
        var LU = this.copy();
        var N = this.size[0];
        var i,j, m;
        for (k=0; k<N-1; k++) {
            for (l=k+1; l<N; l++) {
                m = LU.array[N*l+k]/LU.array[N*k+k];
                for (c=k+1; c<N; c++) 
                    LU.array[N*l+c] -= m*LU.array[N*k+c];
                LU.array[N*l+k] = m;
            }
        }
        return LU;
    }

    /* Extract L from the LU decomposition
     */
    nanAlgebra.Matrix.prototype.grabL = function() {
        var L = this.copy();

        var N = L.size[0];
        for (i=0; i<N; i++) {
            L.array[N*i+i] = 1;
            for (j=i+1; j<N; j++) {
                L.array[N*i+j] = 0;
            }
        }
        return L;
    }

    /* Extract U from the LU decomposition
     */
    nanAlgebra.Matrix.prototype.grabU = function() {
        var U = this.copy();

        var N = U.size[0];
        for (i=0; i<N; i++) {
            for (j=0; j<i; j++) {
                U.array[N*i+j] = 0;
            }
        }
        return U;
    }

    /* A solver for general matrices by LU decomposition
     *
     * When the forward and back solves are designed to accept matrices rather
     * than just vectors, this can be used to invert a matrix.
     */
    nanAlgebra.Matrix.prototype.solve = function (b) {
        if (this.size[0] != this.size[1])
            throw new Error('Matrix must be square');
        if (this.size[1] != b.size[0]) 
            throw new Error('Number of rows in the matrices must agree');

        // TODO: add pivoting
        var LU = this.luDecompose();
        return LU.utSolve(LU.ltSolve(b));
    };

    return nanAlgebra;
});

