import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ExcelService } from '../../services/excel';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class HomeComponent implements OnInit{

  constructor(private excelService: ExcelService){}


  async ngOnInit() {
    this.excelService.warmupStructure().catch((x) => console.log(x));
  }

}