pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CreditoToken.sol";

contract CursosFactory is Ownable, CreditoToken {

    struct Curso {
        uint id;
        string nombre;
        uint8 creditos;
        bool activo;
        address profesor;
        uint[] correlativas; 
    }
    
    struct Aprobacion {
        bool soloCursada;
        uint8 nota;
        uint fechaDeAprobacion;
    }
    
    Curso[] public cursos;
    uint8 notaMaxima=10;
    uint8 notaMinima=4;
    uint public cantidadCursos = 0;
    mapping(address => uint) public creditos;
    mapping(address => mapping(uint => Aprobacion)) public aprobados;
    
    event AproboMateria(address alumno, uint cursoId);
    
    modifier onlyProfessor(uint _cursoId) {
        require(cursos[_cursoId].profesor == msg.sender, "Solo puede aprobar alumnos el profesor del curso");
        _;
    }

    modifier cursoExistente(uint _cursoId) {
        require(cursos.length > _cursoId, "Este curso no existe");
        _;
    }
    
    modifier tieneCorrelativas(address _alumno, uint _cursoId) {
        uint[] memory correlativas = new uint[](cursos[_cursoId].correlativas.length);
        for(uint i=0; i < cursos[_cursoId].correlativas.length; i++){
            uint correlativaId = cursos[_cursoId].correlativas[i];
            require(aprobados[_alumno][correlativaId].soloCursada == false && aprobados[_alumno][correlativaId].nota > 0, "El alumno no tiene las correlativas aprobadas");
        }
        _;
    }
    
    modifier materiaNoAprobada(address _alumno, uint _cursoId) {
        Aprobacion memory aprobacion = aprobados[_alumno][_cursoId];
        require(aprobacion.soloCursada || aprobacion.nota == 0, "El alumno ya aprobo esta materia");
        _;
    }
    
    modifier correlativasExisten(uint8[] memory correlativas) {
        for(uint i=0; i < correlativas.length; i++){
            require(correlativas[i] <= cursos.length , "La correlativa no existe");
        }
        _;
    }
    
    
    function crearCurso(string memory _nombre, uint8 _creditos, uint8[] memory _correlativas, bool _activo, address _profesor) public onlyOwner correlativasExisten(_correlativas){
        cursos.push();
        Curso storage curso = cursos[cantidadCursos];
        curso.id = cantidadCursos;
        modificarCurso(cantidadCursos, _nombre, _creditos, _correlativas, _activo, _profesor);
        cantidadCursos++;
    }
    
    
    function modificarCurso(uint _cursoId, string memory _nombre, uint8 _creditos, uint8[] memory _correlativas, bool _activo, address _profesor) public onlyOwner cursoExistente(_cursoId) {
        Curso storage curso = cursos[_cursoId];
        curso.nombre = _nombre;
        curso.creditos = _creditos;
        curso.activo = _activo;
        curso.profesor = _profesor;
        cursos[_cursoId].correlativas = _correlativas;
    }
    
    function setearNotaMaxima(uint8 _notaMaxima) public onlyOwner{
        notaMaxima = _notaMaxima;
    }
    
    function setearNotaMinima(uint8 _notaMinima) public onlyOwner{
        notaMinima = _notaMinima;
    }
    
    function aprobarAlumno(address _alumno, uint _cursoId, bool _soloCursada, uint8 _nota) public onlyProfessor(_cursoId) tieneCorrelativas( _alumno, _cursoId) materiaNoAprobada(_alumno, _cursoId){
        require(_nota >= notaMinima && _nota <= notaMaxima, "La nota no se encuentra entre las notas posibles`");
        aprobados[_alumno][_cursoId] = Aprobacion(_soloCursada, _nota, block.timestamp * 1000);
        if (!_soloCursada) {
            _transfer(_alumno, cursos[_cursoId].creditos);
        }
        emit AproboMateria(_alumno, _cursoId);
    }
    
    function removerAlumnoDelCurso(address _alumno, uint _cursoId) public onlyProfessor(_cursoId) materiaNoAprobada(_alumno, _cursoId) {
        delete aprobados[_alumno][_cursoId];
    }
    
    function removerCursadasVencidas(address _alumno) public {
        for(uint i=0; i < cursos.length; i++){
            if (aprobados[_alumno][cursos[i].id].fechaDeAprobacion < (block.timestamp * 1000 - 548 days) && aprobados[_alumno][cursos[i].id].soloCursada ){
                delete aprobados[_alumno][cursos[i].id];
            }
        }
    }
    
    function _getCantidadAprobaciones(address _alumno) private view returns (uint) {
        uint j = 0;
         for(uint i=0; i < cursos.length; i++) {
           if (aprobados[_alumno][cursos[i].id].nota > 0){
               j++;
           }
        }
        return j;
    }
    
    function balanceOf(address _owner) override external view returns (uint256 _balance){
        return creditos[_owner];
    }
    
    function _transfer(address _owner, uint8 _amount) private {
        creditos[_owner] += _amount;
    }
    
    function getAlumno(address _alumno) public view returns (address, uint,uint[] memory, string[] memory, Aprobacion[] memory){
        Aprobacion[] memory aprobaciones = new Aprobacion[](_getCantidadAprobaciones(_alumno));
        uint[] memory cursosId = new uint[](_getCantidadAprobaciones(_alumno));
        string[] memory cursosName = new string[](_getCantidadAprobaciones(_alumno));
        uint j = 0;
        uint i = 0;
        while(j < _getCantidadAprobaciones(_alumno)) {
            if (aprobados[_alumno][cursos[i].id].nota > 0){
                Aprobacion memory aprobacion = aprobados[_alumno][cursos[i].id];
                cursosId[j] = cursos[i].id;
                cursosName[j] = cursos[i].nombre; 
                aprobaciones[j] = aprobacion;
                j++;
            }
            i++;
        }
        return (_alumno, creditos[_alumno], cursosId, cursosName, aprobaciones);
    }
    
    function getCursos()public view returns (Curso[] memory){
        return cursos;
        
    }
    
}